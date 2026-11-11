/**
 * Armazenamento persistente das fotografias.
 * Docker local: disco montado em volume. Vercel: Azure Blob Storage com SAS
 * privado, mantido exclusivamente no servidor (nunca enviado ao navegador).
 */
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

export type ProvedorFoto = "LOCAL" | "AZURE_BLOB";

export class ErroArmazenamento extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroArmazenamento";
  }
}

function tipoFoto(nome: string) {
  return nome.endsWith(".jpg") ? "image/jpeg" :
    nome.endsWith(".png") ? "image/png" : "image/webp";
}

function enderecoAzure(nome: string) {
  const container = process.env.AZURE_BLOB_CONTAINER_URL?.trim();
  const sas = process.env.AZURE_BLOB_SAS_TOKEN?.trim().replace(/^\?/, "");
  if (!container || !sas) {
    throw new ErroArmazenamento(
      "O armazenamento de fotos em nuvem não está configurado. Informe o suporte."
    );
  }
  const url = new URL(container);
  if (url.protocol !== "https:" || url.search || url.hash || !url.pathname.replace(/\//g, "")) {
    throw new ErroArmazenamento("A configuração do contêiner Azure Blob é inválida.");
  }
  url.pathname = url.pathname.replace(/\/$/, "") + "/" + encodeURIComponent(nome);
  url.search = sas;
  return url.toString();
}

function selecionarProvedor(): ProvedorFoto {
  if (process.env.AZURE_BLOB_CONTAINER_URL || process.env.AZURE_BLOB_SAS_TOKEN) {
    if (!process.env.AZURE_BLOB_CONTAINER_URL || !process.env.AZURE_BLOB_SAS_TOKEN) {
      throw new ErroArmazenamento("Configure ambas as variáveis do Azure Blob Storage.");
    }
    return "AZURE_BLOB";
  }
  if (process.env.VERCEL === "1") {
    throw new ErroArmazenamento(
      "Configure o Azure Blob Storage antes de cadastrar fotos na Vercel."
    );
  }
  return "LOCAL";
}

export async function salvarFoto(nome: string, bytes: Uint8Array): Promise<ProvedorFoto> {
  const provedor = selecionarProvedor();
  if (provedor === "AZURE_BLOB") {
    const resposta = await fetch(enderecoAzure(nome), {
      method: "PUT",
      headers: {
        "x-ms-blob-type": "BlockBlob",
        "x-ms-version": "2021-12-02",
        "Content-Type": tipoFoto(nome),
      },
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
  if (provedor === "AZURE_BLOB") {
    const resposta = await fetch(enderecoAzure(nome), {
      headers: { "x-ms-version": "2021-12-02" },
      cache: "no-store",
      signal: AbortSignal.timeout(30_000),
    });
    if (!resposta.ok) throw new ErroArmazenamento("Foto indisponível no armazenamento Azure.");
    return new Uint8Array(await resposta.arrayBuffer());
  }
  return new Uint8Array(await readFile(join(process.cwd(), "storage", "uploads", nome)));
}

export async function excluirFoto(nome: string, provedor: ProvedorFoto): Promise<void> {
  if (provedor === "AZURE_BLOB") {
    const resposta = await fetch(enderecoAzure(nome), {
      method: "DELETE",
      headers: { "x-ms-version": "2021-12-02" },
      signal: AbortSignal.timeout(30_000),
    });
    if (!resposta.ok && resposta.status !== 404) {
      throw new ErroArmazenamento("Não foi possível apagar a foto no Azure Blob Storage.");
    }
  } else {
    await unlink(join(process.cwd(), "storage", "uploads", nome));
  }
}
