import { NextRequest, NextResponse } from "next/server";
import { administradorAtual } from "../../../../lib/auth";
import { buscarAdministrativas } from "../../../../lib/ocorrencias";
import { mesmaOrigem } from "../../../../lib/seguranca";
import { moderarOcorrencia, type AcaoModeracao } from "../../../../models/administracao";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const usuario = await administradorAtual();
  if (!usuario?.adminResgate) return NextResponse.json({ erro: "Acesso administrativo negado." }, { status: 403 });
  const parametros = request.nextUrl.searchParams;
  const status = parametros.get("status") || "PENDENTE";
  if (!["PENDENTE","APROVADO","REJEITADO","OCULTO","TODAS"].includes(status)) return NextResponse.json({ erro: "Filtro inválido." }, { status: 400 });
  const valorPagina = parametros.get("pagina") || "1";
  if (!/^[1-9]\d*$/.test(valorPagina) || !Number.isSafeInteger(Number(valorPagina))) {
    return NextResponse.json({ erro: "Página inválida." }, { status: 400 });
  }
  const aprovacao = parametros.get("aprovacao") || "";
  const especie = parametros.get("especie") || "";
  const tipo = parametros.get("tipo") || "";
  const ordem = parametros.get("ordem") || "RECENTE";
  const busca = (parametros.get("busca") || "").trim().slice(0, 100);
  if ((aprovacao && !["PENDENTE","APROVADO","REJEITADO","OCULTO"].includes(aprovacao)) ||
    (especie && !["Cachorro","Gato"].includes(especie)) ||
    (tipo && !["PERDIDO","ENCONTRADO"].includes(tipo)) ||
    !["RECENTE","ANTIGO"].includes(ordem)) {
    return NextResponse.json({ erro: "Filtro inválido." }, { status: 400 });
  }
  try {
    const resultado = await buscarAdministrativas(status, {
      pagina: Number(valorPagina), porPagina: 10, busca, aprovacao, especie, tipo, ordem,
    });
    return NextResponse.json(resultado, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Erro na consulta ADM", error);
    return NextResponse.json({ erro: "Falha ao carregar solicitações." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!mesmaOrigem(request)) return NextResponse.json({ erro: "Origem inválida." }, { status: 403 });
  const usuario = await administradorAtual();
  if (!usuario?.adminResgate) return NextResponse.json({ erro: "Acesso administrativo negado." }, { status: 403 });
  try {
    const corpo = await request.json();
    const id = Number(corpo.id);
    const acao = typeof corpo.acao === "string" ? corpo.acao : "";
    const motivo = typeof corpo.motivo === "string" ? corpo.motivo.trim().slice(0, 500) : "";
    if (!Number.isSafeInteger(id) || id < 1 ||
      !["APROVAR", "REJEITAR", "OCULTAR"].includes(acao) ||
      (acao !== "APROVAR" && motivo.length < 5)) {
      return NextResponse.json({ erro: "Informe a ocorrência, a ação e um motivo para rejeição ou ocultação." }, { status: 400 });
    }
    const resultado = await moderarOcorrencia(id, acao as AcaoModeracao, motivo, usuario.id);
    if ("erro" in resultado) return NextResponse.json({ erro: resultado.erro }, { status: resultado.codigo });
    return NextResponse.json({ ok: true, status: resultado.status });
  } catch (error) {
    console.error("Erro de moderação", error);
    return NextResponse.json({ erro: "Falha ao atualizar a ocorrência." }, { status: 500 });
  }
}
