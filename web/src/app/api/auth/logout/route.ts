import { NextResponse } from "next/server";
import { encerrarSessao } from "../../../../lib/auth";
import { mesmaOrigem } from "../../../../lib/seguranca";
export const runtime = "nodejs";
export async function POST(request: Request) {
  if (!mesmaOrigem(request)) return NextResponse.json({erro:"Origem não permitida."},{status:403});
  try {
    await encerrarSessao();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro no logout", error);
    return NextResponse.json({ erro: "Não foi possível encerrar a sessão." }, { status: 500 });
  }
}
