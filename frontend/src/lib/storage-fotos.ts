/**
 * Armazenamento das fotos: disco local no Docker, Azure Blob (legado) ou
 * Cloudinary com entrega autenticada. Credenciais existem somente no servidor.
 * Toda leitura passa por /api/fotos, após validação de permissões no MySQL.
 */
import "server-only";
import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type ProvedorFoto = "LOCAL" | "AZURE_BLOB" | "CLOUDINARY";

export class ErroArmazenamento extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroArmazenamento";
  }
}

const PADRAO_NOME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

function validarNome(nome: string): void {
  if (!PADRAO_NOME.test(nome)) throw new ErroArmazenamento("Nome de fotografia inválido.");
}
function tipoFoto(nome: string) {
  return nome.endsWith(".jpg") ? "image/jpeg" :
    nome.endsWith(".png") ? "image/png" : "image/webp";
}

function enderecoAzure(nome: string) {
  const container = process.env.AZURE_BLOB_CONTAINER_URL?.trim();
  const sas = process.env.AZURE_BLOB_SAS_TOKEN?.trim().replace(/^\?/, "");
  if (!container || !sas) throw new ErroArmazenamento("Armazenamento Azure não configurado.");
  const url = new URL(container);
  if (url.protocol !== "https:" || url.search || url.hash || !url.pathname.replace(/\//g, "")) {
    throw new ErroArmazenamento("Configuração do Azure Blob inválida.");
  }
  url.pathname = url.pathname.replace(/\/$/, "") + "/" + encodeURIComponent(nome);
  url.search = sas;
  return url.toString();
}

function credenciaisCloudinary() {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim() || "";
  const key = process.env.CLOUDINARY_API_KEY?.trim() || "";
  const secret = process.env.CLOUDINARY_API_SECRET?.trim() || "";
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(cloud) || !key || !secret) {
    throw new ErroArmazenamento("Credenciais Cloudinary incompletas ou inválidas.");
  }
  return { cloud, key, secret };
}

function publicId(nome: string): string {
  validarNome(nome);
  return "resgate-animais/" + nome.slice(0, nome.lastIndexOf("."));
}

function assinaturaCloudinary(parametros: Record<string, string>, secret: string) {
  const texto = Object.entries(parametros)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([chave, valor]) => chave + "=" + valor)
    .join("&");
  return createHash("sha1").update(texto + secret).digest("hex");
}

function selecionarProvedor(): ProvedorFoto {
  const cloudinary = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]
    .some(chave => Boolean(process.env[chave]));
  const azure = Boolean(process.env.AZURE_BLOB_CONTAINER_URL || process.env.AZURE_BLOB_SAS_TOKEN);
  if (cloudinary && azure) throw new ErroArmazenamento("Configure somente um provedor externo de fotos.");
  if (cloudinary) {
    credenciaisCloudinary();
    return "CLOUDINARY";
  }
  if (azure) {
    if (!process.env.AZURE_BLOB_CONTAINER_URL || !process.env.AZURE_BLOB_SAS_TOKEN)
      throw new ErroArmazenamento("Configure ambas as variáveis do Azure Blob.");
    return "AZURE_BLOB";
  }
  if (process.env.VERCEL === "1") {
    throw new ErroArmazenamento("Configure a Cloudinary antes de cadastrar fotos na Vercel.");
  }
  return "LOCAL";
}

function autenticacaoBasica(key: string, secret: string) {
  return "Basic " + Buffer.from(key + ":" + secret, "utf8").toString("base64");
}

async function salvarCloudinary(nome: string, bytes: Uint8Array) {
  const { cloud, key, secret } = credenciaisCloudinary();
  const id = publicId(nome);
  const form = new FormData();
  form.set("file", new Blob([new Uint8Array(bytes).buffer as ArrayBuffer], { type: tipoFoto(nome) }), nome);
  form.set("public_id", id);
  form.set("type", "authenticated");
  form.set("overwrite", "false");
  const resposta = await fetch("https://api.cloudinary.com/v1_1/" + cloud + "/image/upload", {
    method: "POST",
    headers: { Authorization: autenticacaoBasica(key, secret) },
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  if (!resposta.ok) {
    // O corpo remoto pode conter detalhes da conta: registrar apenas o status.
    console.error("Cloudinary recusou o upload", { httpStatus: resposta.status });
    throw new ErroArmazenamento("Falha ao salvar foto na Cloudinary (HTTP " + resposta.status + ").");
  }
  const json = await resposta.json() as { public_id?: string; type?: string };
  if (json.public_id !== id || json.type !== "authenticated") {
    throw new ErroArmazenamento("Cloudinary retornou um identificador ou tipo de acesso inesperado.");
  }
}

async function lerCloudinary(nome: string) {
  const { cloud, key, secret } = credenciaisCloudinary();
  const parametros = {
    format: nome.slice(nome.lastIndexOf(".") + 1),
    public_id: publicId(nome),
    timestamp: String(Math.floor(Date.now() / 1000)),
    type: "authenticated",
  };
  const url = new URL("https://api.cloudinary.com/v1_1/" + cloud + "/image/download");
  for (const [chave, valor] of Object.entries(parametros)) url.searchParams.set(chave, valor);
  url.searchParams.set("api_key", key);
  url.searchParams.set("signature", assinaturaCloudinary(parametros, secret));
  const resposta = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(30_000),
  });
  if (!resposta.ok) throw new ErroArmazenamento("Foto indisponível na Cloudinary.");
  const bytes = new Uint8Array(await resposta.arrayBuffer());
  if (bytes.length > 6 * 1024 * 1024) throw new ErroArmazenamento("Fotografia excede o limite esperado.");
  return bytes;
}

async function excluirCloudinary(nome: string) {
  const { cloud, key, secret } = credenciaisCloudinary();
  const form = new FormData();
  form.set("public_id", publicId(nome));
  form.set("type", "authenticated");
  const resposta = await fetch("https://api.cloudinary.com/v1_1/" + cloud + "/image/destroy", {
    method: "POST",
    headers: { Authorization: autenticacaoBasica(key, secret) },
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  if (!resposta.ok) throw new ErroArmazenamento("Falha ao remover fotografia na Cloudinary.");
  const json = await resposta.json() as { result?: string };
  if (!["ok", "not found"].includes(json.result || "")) {
    throw new ErroArmazenamento("Cloudinary não confirmou a exclusão da fotografia.");
  }
}

export async function salvarFoto(nome: string, bytes: Uint8Array): Promise<ProvedorFoto> {
  validarNome(nome);
  const provedor = selecionarProvedor();
  if (provedor === "CLOUDINARY") {
    await salvarCloudinary(nome, bytes);
  } else if (provedor === "AZURE_BLOB") {
    const resposta = await fetch(enderecoAzure(nome), {
      method: "PUT",
      headers: { "x-ms-blob-type": "BlockBlob", "x-ms-version": "2021-12-02", "Content-Type": tipoFoto(nome) },
      body: new Uint8Array(bytes).buffer as ArrayBuffer,
      signal: AbortSignal.timeout(60_000),
    });
    if (!resposta.ok) throw new ErroArmazenamento("Falha ao gravar foto no Azure Blob Storage.");
  } else {
    const pasta = join(process.cwd(), "storage", "uploads");
    await mkdir(pasta, { recursive: true });
    await writeFile(join(pasta, nome), bytes, { flag: "wx" });
  }
  return provedor;
}

export async function lerFoto(nome: string, provedor: ProvedorFoto): Promise<Uint8Array> {
  validarNome(nome);
  if (provedor === "CLOUDINARY") return lerCloudinary(nome);
  if (provedor === "AZURE_BLOB") {
    const resposta = await fetch(enderecoAzure(nome), {
      headers: { "x-ms-version": "2021-12-02" }, cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!resposta.ok) throw new ErroArmazenamento("Foto indisponível no armazenamento Azure.");
    return new Uint8Array(await resposta.arrayBuffer());
  }
  return new Uint8Array(await readFile(join(process.cwd(), "storage", "uploads", nome)));
}

export async function excluirFoto(nome: string, provedor: ProvedorFoto): Promise<void> {
  validarNome(nome);
  if (provedor === "CLOUDINARY") return excluirCloudinary(nome);
  if (provedor === "AZURE_BLOB") {
    const resposta = await fetch(enderecoAzure(nome), {
      method: "DELETE", headers: { "x-ms-version": "2021-12-02" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!resposta.ok && resposta.status !== 404) {
      throw new ErroArmazenamento("Não foi possível apagar a foto no Azure Blob Storage.");
    }
  } else {
    await unlink(join(process.cwd(), "storage", "uploads", nome));
  }
}
