import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { usuarioAtual, administradorAtual } from "../../../../../lib/auth";
import { mesmaOrigem } from "../../../../../lib/seguranca";
import { ErroArmazenamento } from "../../../../../lib/storage-fotos";
import { adicionarFotosOcorrencia, removerFotoOcorrencia } from "../../../../../models/fotos-ocorrencia";

export const runtime = "nodejs";
type Contexto = { params: Promise<{ id: string }> };
type Arquivo = { nome: string; bytes: Uint8Array };
const formatoId = /^[1-9]\d{0,9}$/;

function err(texto: string, status: number) {
  return NextResponse.json({ erro: texto }, { status });
}
function extensaoImagem(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
  if (bytes.length >= 8 && [137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v)) return "png";
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "webp";
  return null;
}

export async function POST(request: Request, contexto: Contexto) {
  if (!mesmaOrigem(request)) return err("Origem não permitida.", 403);
  const usuario = (await usuarioAtual()) ?? (await administradorAtual());
  if (!usuario) return err("Entre na sua conta.", 401);
  const { id: valor } = await contexto.params;
  if (!formatoId.test(valor)) return err("Identificador inválido.", 400);
  if (Number(request.headers.get("content-length") || 0) > 26 * 1024 * 1024) return err("Fotos excedem o limite.", 413);
  try {
    const form = await request.formData();
    const fotos = form.getAll("fotos").filter((v): v is File => v instanceof File);
    if (fotos.length < 1 || fotos.length > 5 || fotos.some(f => f.size === 0 || f.size > 5 * 1024 * 1024))
      return err("Selecione de 1 a 5 fotos, cada uma com até 5 MB.", 400);
    const arquivos: Arquivo[] = [];
    for (const foto of fotos) {
      const bytes = new Uint8Array(await foto.arrayBuffer());
      const ext = extensaoImagem(bytes);
      if (!ext || !(foto.type === "image/jpeg" && ext === "jpg" ||
        foto.type === "image/png" && ext === "png" || foto.type === "image/webp" && ext === "webp"))
        return err("Envie apenas fotos JPG, PNG ou WebP válidas.", 400);
      arquivos.push({ nome: randomUUID() + "." + ext, bytes });
    }
    const resultado = await adicionarFotosOcorrencia(Number(valor), usuario.id, arquivos);
    if ("erro" in resultado) return err(resultado.erro, resultado.status);
    return NextResponse.json({ ok: true, fotos: resultado.fotos });
  } catch (error) {
    console.error("Falha ao adicionar fotografias", error);
    return error instanceof ErroArmazenamento ? err(error.message, 503) : err("Não foi possível adicionar as fotos.", 500);
  }
}

export async function DELETE(request: Request, contexto: Contexto) {
  if (!mesmaOrigem(request)) return err("Origem não permitida.", 403);
  const usuario = (await usuarioAtual()) ?? (await administradorAtual());
  if (!usuario) return err("Entre na sua conta.", 401);
  const { id: valor } = await contexto.params;
  if (!formatoId.test(valor)) return err("Identificador inválido.", 400);
  try {
    const dados = await request.json() as { idFoto?: number };
    const idFoto = Number(dados.idFoto);
    if (!Number.isSafeInteger(idFoto) || idFoto < 1) return err("Fotografia inválida.", 400);
    const resultado = await removerFotoOcorrencia(Number(valor), usuario.id, idFoto);
    if ("erro" in resultado) return err(resultado.erro, resultado.status);
    return NextResponse.json({ ok: true, fotos: resultado.fotos });
  } catch (error) {
    console.error("Falha ao remover fotografia", error);
    return err("Não foi possível remover a fotografia.", 500);
  }
}
