import { NextResponse } from "next/server";
import { usuarioAtual, administradorAtual } from "../../../lib/auth";
import { mesmaOrigem } from "../../../lib/seguranca";
import { consultarNotificacoes, marcarNotificacoesLidas } from "../../../models/notificacoes";

export const runtime = "nodejs";

export async function GET() {
  const usuario = (await usuarioAtual()) ?? (await administradorAtual());
  if (!usuario) return NextResponse.json({ erro: "Entre na sua conta." }, { status: 401 });
  try {
    const resultado = await consultarNotificacoes(usuario.id);
    return NextResponse.json(resultado, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Erro ao consultar notificações", error);
    return NextResponse.json({ erro: "Não foi possível consultar seus avisos." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!mesmaOrigem(request)) return NextResponse.json({ erro: "Origem não permitida." }, { status: 403 });
  const usuario = (await usuarioAtual()) ?? (await administradorAtual());
  if (!usuario) return NextResponse.json({ erro: "Entre na sua conta." }, { status: 401 });
  try {
    const data = await request.json() as { id?: number; todas?: boolean };
    const id = Number(data.id);
    if (data.todas === true) {
      await marcarNotificacoesLidas(usuario.id);
    } else if (Number.isSafeInteger(id) && id > 0) {
      await marcarNotificacoesLidas(usuario.id, id);
    } else {
      return NextResponse.json({ erro: "Notificação inválida." }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro ao marcar notificação", error);
    return NextResponse.json({ erro: "Não foi possível marcar o aviso." }, { status: 500 });
  }
}
