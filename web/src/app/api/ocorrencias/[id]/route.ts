import { NextResponse } from "next/server";
import { buscarPublicaPorId } from "../../../../lib/ocorrencias";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[1-9]\d{0,9}$/.test(id)) return NextResponse.json({ erro: "Identificador inválido." }, { status: 400 });
  try {
    const ocorrencia = await buscarPublicaPorId(Number(id));
    if (!ocorrencia) return NextResponse.json({ erro: "Ocorrência não encontrada." }, { status: 404 });
    return NextResponse.json({ ocorrencia }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ erro: "Erro na consulta da ocorrência." }, { status: 500 });
  }
}
