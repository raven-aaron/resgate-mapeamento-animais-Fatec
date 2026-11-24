import { NextResponse } from "next/server";
import { usuarioAtual, administradorAtual } from "../../../../../lib/auth";
import { mesmaOrigem } from "../../../../../lib/seguranca";
import {
  buscarConversaAutorizada, listarMensagens, marcarMensagensLidas, contarMensagensRecentes, enviarMensagem,
} from "../../../../../models/conversas";

export const runtime = "nodejs";
type Contexto = { params: Promise<{ id: string }> };

export async function GET(_request: Request, contexto: Contexto) {
  const usuario = (await usuarioAtual()) ?? (await administradorAtual());
  if (!usuario) return NextResponse.json({ erro: "Sessão necessária." }, { status: 401 });
  const { id: valor } = await contexto.params;
  if (!/^[1-9]\d{0,9}$/.test(valor)) return NextResponse.json({ erro: "Conversa inválida." }, { status: 400 });
  try {
    const conversa = await buscarConversaAutorizada(Number(valor), usuario.id);
    if (!conversa) return NextResponse.json({ erro: "Conversa não encontrada." }, { status: 404 });
    const mensagens = await listarMensagens(Number(valor));
    return NextResponse.json({
      conversa: {
        id: Number(conversa.id_conversa), ocorrencia: Number(conversa.id_ocorrencia),
        animal: conversa.animal, tipo: conversa.tipo,
        interlocutor: Number(conversa.id_dono) === usuario.id ? conversa.interessado : conversa.dono,
        situacao: conversa.situacao,
        podeEnviar: conversa.situacao === "ATIVA" && conversa.status_aprovacao === "APROVADO" &&
          conversa.status_caso === "ABERTO" && !conversa.excluido_em,
      },
      mensagens, meuId: usuario.id,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Erro na consulta de mensagens", error);
    return NextResponse.json({ erro: "Falha ao consultar mensagens." }, { status: 500 });
  }
}

export async function PATCH(request: Request, contexto: Contexto) {
  if (!mesmaOrigem(request)) return NextResponse.json({ erro: "Origem inválida." }, { status: 403 });
  const usuario = (await usuarioAtual()) ?? (await administradorAtual());
  if (!usuario) return NextResponse.json({ erro: "Sessão necessária." }, { status: 401 });
  const { id: valor } = await contexto.params;
  if (!/^[1-9]\d{0,9}$/.test(valor)) return NextResponse.json({ erro: "Conversa inválida." }, { status: 400 });
  try {
    const dados = await request.json() as { ateId?: unknown };
    const ateId = Number(dados?.ateId);
    if (!Number.isSafeInteger(ateId) || ateId < 1) return NextResponse.json({ erro: "Mensagem inválida." }, { status: 400 });
    const id = Number(valor);
    const conversa = await buscarConversaAutorizada(id, usuario.id);
    if (!conversa) return NextResponse.json({ erro: "Conversa não encontrada." }, { status: 404 });
    await marcarMensagensLidas(id, usuario.id, ateId);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Falha ao confirmar leitura", error);
    return NextResponse.json({ erro: "Não foi possível marcar como lida." }, { status: 500 });
  }
}

export async function POST(request: Request, contexto: Contexto) {
  if (!mesmaOrigem(request)) return NextResponse.json({ erro: "Origem inválida." }, { status: 403 });
  const usuario = (await usuarioAtual()) ?? (await administradorAtual());
  if (!usuario) return NextResponse.json({ erro: "Sessão necessária." }, { status: 401 });
  const { id: valor } = await contexto.params;
  if (!/^[1-9]\d{0,9}$/.test(valor)) return NextResponse.json({ erro: "Conversa inválida." }, { status: 400 });
  try {
    if (Number(request.headers.get("content-length") || 0) > 4500) return NextResponse.json({ erro: "Mensagem muito extensa." }, { status: 413 });
    const dados = await request.json();
    const conteudo = typeof dados.conteudo === "string" ? dados.conteudo.trim() : "";
    if (conteudo.length < 1 || conteudo.length > 2000)
      return NextResponse.json({ erro: "Escreva uma mensagem de até 2.000 caracteres." }, { status: 400 });
    const conversa = await buscarConversaAutorizada(Number(valor), usuario.id);
    if (!conversa) return NextResponse.json({ erro: "Conversa não encontrada." }, { status: 404 });
    if (conversa.situacao !== "ATIVA" || conversa.status_aprovacao !== "APROVADO" ||
      conversa.status_caso !== "ABERTO" || conversa.excluido_em)
      return NextResponse.json({ erro: "Esta conversa não aceita novas mensagens." }, { status: 409 });
    const recente = await contarMensagensRecentes(Number(valor), usuario.id);
    if (recente >= 3) return NextResponse.json({ erro: "Aguarde um instante antes de enviar mais mensagens." }, { status: 429 });
    const destinatario = Number(conversa.id_dono) === usuario.id ?
      Number(conversa.id_interessado) : Number(conversa.id_dono);
    const id = await enviarMensagem(Number(valor), usuario.id, conteudo, destinatario, Number(conversa.id_ocorrencia));
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("Falha no envio de mensagem", error);
    return NextResponse.json({ erro: "Não foi possível enviar a mensagem." }, { status: 500 });
  }
}
