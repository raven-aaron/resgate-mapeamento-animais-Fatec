import { NextResponse } from "next/server";
import { administradorAtual } from "../../../../lib/auth";
import { mesmaOrigem } from "../../../../lib/seguranca";
import { alterarPermissaoResgate, type AcaoPermissao } from "../../../../models/usuarios";

export const runtime = "nodejs";
const acoes: AcaoPermissao[] = ["CONCEDER_ADMIN", "REVOGAR_ADMIN"];

export async function PATCH(request: Request) {
  if (!mesmaOrigem(request)) return NextResponse.json({ erro: "Origem não permitida." }, { status: 403 });
  const solicitante = await administradorAtual();
  if (!solicitante?.adminResgate) return NextResponse.json({ erro: "Acesso administrativo negado." }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 4096) {
    return NextResponse.json({ erro: "Dados inválidos." }, { status: 413 });
  }
  try {
    const dados = await request.json() as { id?: unknown; acao?: unknown; confirmacao?: unknown };
    const id = Number(dados.id);
    const acao = dados.acao;
    const confirmacao = typeof dados.confirmacao === "string" ? dados.confirmacao.trim().toLowerCase() : "";
    if (!Number.isSafeInteger(id) || id < 1 || !acoes.includes(acao as AcaoPermissao) || !confirmacao || confirmacao.length > 254) {
      return NextResponse.json({ erro: "Confirme a ação e o e-mail da conta." }, { status: 400 });
    }
    if (id === solicitante.id) {
      return NextResponse.json({ erro: "Não é permitido alterar a própria conta administrativa." }, { status: 409 });
    }
    const resultado = await alterarPermissaoResgate(id, acao as AcaoPermissao, confirmacao, solicitante.id);
    if ("erro" in resultado) return NextResponse.json({ erro: resultado.erro }, { status: resultado.status });
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Falha ao gerenciar usuário", error);
    return NextResponse.json({ erro: "Não foi possível alterar a conta." }, { status: 500 });
  }
}
