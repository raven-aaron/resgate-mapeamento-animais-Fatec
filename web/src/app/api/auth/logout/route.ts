import { NextResponse } from "next/server";
import { encerrarSessao } from "../../../../lib/auth";
export const runtime = "nodejs";
export async function POST() {
  try {
    await encerrarSessao();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Erro no logout", error);
    return NextResponse.json({ erro: "Não foi possível encerrar a sessão." }, { status: 500 });
  }
}
