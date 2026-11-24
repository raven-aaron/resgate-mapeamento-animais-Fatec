import { NextResponse } from "next/server";
import { usuarioAtual, administradorAtual } from "../../../lib/auth";
import { mesmaOrigem } from "../../../lib/seguranca";
import { listarConversas, buscarOcorrenciaParaContato, iniciarConversa } from "../../../models/conversas";

export const runtime = "nodejs";

export async function GET() {
  try {
    const usuario = (await usuarioAtual()) ?? (await administradorAtual());
    if (!usuario) return NextResponse.json({ erro: "Entre na sua conta.", login: true }, { status: 401 });
    const conversas = await listarConversas(usuario.id);
    return NextResponse.json({ conversas }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Erro de listagem de conversas", error);
    return NextResponse.json({ erro: "Não foi possível carregar conversas." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!mesmaOrigem(request)) return NextResponse.json({ erro: "Origem inválida." }, { status: 403 });
  const usuario = (await usuarioAtual()) ?? (await administradorAtual());
  if (!usuario) return NextResponse.json({ erro: "Entre para iniciar uma conversa.", login: true }, { status: 401 });
  try {
    if (Number(request.headers.get("content-length") || 0) > 1000) return NextResponse.json({ erro: "Dados inválidos." }, { status: 413 });
    const body = await request.json();
    const id = Number(body.ocorrencia);
    if (!Number.isSafeInteger(id) || id < 1) return NextResponse.json({ erro: "Ocorrência inválida." }, { status: 400 });
    const o = await buscarOcorrenciaParaContato(id);
    if (!o || o.status_aprovacao !== "APROVADO" || o.status_caso !== "ABERTO" || o.excluido_em)
      return NextResponse.json({ erro: "A ocorrência não está disponível para contato." }, { status: 404 });
    if (Number(o.id_usuario_criador) === usuario.id)
      return NextResponse.json({ erro: "Você é responsável por este cartaz. Consulte suas mensagens recebidas." }, { status: 409 });
    const idConversa = await iniciarConversa(id, usuario.id);
    if (!Number.isSafeInteger(idConversa) || idConversa < 1)
      throw new Error("A conversa foi criada, mas seu identificador não pôde ser recuperado.");
    return NextResponse.json({ id: idConversa }, { status: 200 });
  } catch (error) {
    console.error("Erro ao iniciar conversa", error);
    return NextResponse.json({ erro: "Não foi possível iniciar o chat." }, { status: 500 });
  }
}
