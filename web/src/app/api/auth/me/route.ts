import { NextResponse } from "next/server";
import { usuarioAtual } from "../../../../lib/auth";
export const runtime = "nodejs";
export async function GET() {
  try {
    const usuario = await usuarioAtual();
    return NextResponse.json({ usuario }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ erro: "Erro ao consultar sessão." }, { status: 500 });
  }
}
