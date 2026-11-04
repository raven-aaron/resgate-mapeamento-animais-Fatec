import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { banco } from "../../../../lib/db";
import { administradorAtual } from "../../../../lib/auth";
import { buscarAdministrativas } from "../../../../lib/ocorrencias";
import { mesmaOrigem } from "../../../../lib/seguranca";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const usuario = await administradorAtual();
  if (!usuario?.adminResgate) return NextResponse.json({ erro: "Acesso administrativo negado." }, { status: 403 });
  const status = request.nextUrl.searchParams.get("status") || "PENDENTE";
  if (!["PENDENTE","APROVADO","REJEITADO","OCULTO","TODAS"].includes(status)) return NextResponse.json({ erro: "Filtro inválido." }, { status: 400 });
  try {
    const ocorrencias = await buscarAdministrativas(status);
    return NextResponse.json({ ocorrencias }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Erro na consulta ADM",error);
    return NextResponse.json({ erro: "Falha ao carregar solicitações." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  if (!mesmaOrigem(request)) return NextResponse.json({ erro: "Origem inválida." }, { status: 403 });
  const usuario = await administradorAtual();
  if (!usuario?.adminResgate) return NextResponse.json({ erro: "Acesso administrativo negado." }, { status: 403 });
  let conn: Awaited<ReturnType<ReturnType<typeof banco>["getConnection"]>> | undefined;
  try {
    const corpo = await request.json();
    const id = Number(corpo.id);
    const acao = typeof corpo.acao === "string" ? corpo.acao : "";
    const motivo = typeof corpo.motivo === "string" ? corpo.motivo.trim().slice(0,500) : "";
    const estados: Record<string,string> = { APROVAR: "APROVADO", REJEITAR: "REJEITADO", OCULTAR: "OCULTO" };
    if (!Number.isSafeInteger(id) || id < 1 || !(acao in estados) || (acao !== "APROVAR" && motivo.length < 5)) {
      return NextResponse.json({ erro: "Informe a ocorrência, a ação e um motivo para rejeição ou ocultação." }, { status: 400 });
    }
    conn = await banco().getConnection();
    await conn.beginTransaction();
    const [rows] = await conn.execute<RowDataPacket[]>(
      "SELECT status_aprovacao, status_caso, id_usuario_criador FROM ocorrencias WHERE id_ocorrencia=? AND excluido_em IS NULL FOR UPDATE", [id]
    );
    const anterior = rows[0];
    if (!anterior) {
      await conn.rollback();
      return NextResponse.json({ erro: "Ocorrência não encontrada." }, { status: 404 });
    }
    if ((acao === "APROVAR" || acao === "REJEITAR") && anterior.status_aprovacao !== "PENDENTE") {
      await conn.rollback();
      return NextResponse.json({ erro: "Somente solicitações pendentes podem ser aprovadas ou rejeitadas." }, { status: 409 });
    }
    if (acao === "APROVAR" && anterior.status_caso !== "ABERTO") {
      await conn.rollback();
      return NextResponse.json({ erro: "Este caso não está aberto." }, { status: 409 });
    }
    await conn.execute("UPDATE ocorrencias SET status_aprovacao=? WHERE id_ocorrencia=?", [estados[acao],id]);
    const historia = acao === "APROVAR" ? "APROVACAO" : acao === "REJEITAR" ? "REJEICAO" : "OCULTACAO";
    await conn.execute(
      "INSERT INTO historico_ocorrencias (id_ocorrencia,id_usuario_responsavel,acao,motivo,dados_anteriores,dados_novos) VALUES (?,?,?,?,?,?)",
      [id,usuario.id,historia,motivo || null,JSON.stringify({ status_aprovacao: anterior.status_aprovacao }),JSON.stringify({ status_aprovacao: estados[acao] })]
    );
    await conn.execute(
      "INSERT INTO auditoria (id_usuario_responsavel,modulo,acao,entidade,id_registro,detalhe) VALUES (?,'RESGATE',?,'ocorrencias',?,?)",
      [usuario.id,historia,id,motivo || null]
    );
    await conn.execute(
      "INSERT INTO notificacoes (id_usuario,modulo,tipo,id_ocorrencia,texto) "+
      "VALUES (?,'RESGATE',?,?,?)",
      [Number(anterior.id_usuario_criador),
        acao==="APROVAR"?"OCORRENCIA_APROVADA":acao==="REJEITAR"?"OCORRENCIA_REJEITADA":"OCORRENCIA_OCULTA",
        id,
        acao==="APROVAR"?"Sua ocorrência foi aprovada e está no mapa.":
        acao==="REJEITAR"?"Sua ocorrência foi rejeitada. Veja o motivo em Minhas ocorrências.":
        "Sua ocorrência foi ocultada pela administração."
      ]
    );
    await conn.commit();
    return NextResponse.json({ ok: true, status: estados[acao] });
  } catch (error) {
    if(conn) await conn.rollback().catch(() => undefined);
    console.error("Erro de moderação",error);
    return NextResponse.json({ erro: "Falha ao atualizar a ocorrência." }, { status: 500 });
  } finally { conn?.release(); }
}
