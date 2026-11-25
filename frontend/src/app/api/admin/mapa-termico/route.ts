import { NextResponse } from "next/server";
import { administradorAtual } from "../../../../lib/auth";
import { consultarMapaTermico } from "../../../../models/administracao";

export const runtime = "nodejs";

export async function GET() {
  const usuario = await administradorAtual();
  if (!usuario?.adminResgate) return NextResponse.json({ erro: "Acesso administrativo negado." }, { status: 403 });
  try {
    const zonas = await consultarMapaTermico();
    return NextResponse.json({ zonas }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Falha no mapa térmico", error);
    return NextResponse.json({ erro: "Não foi possível calcular a densidade." }, { status: 500 });
  }
}
