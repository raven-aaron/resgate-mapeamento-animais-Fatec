import "server-only";
import type { RowDataPacket } from "mysql2/promise";
import { banco } from "../lib/db";

export async function consultarMapaTermico() {
  const [rows] = await banco().query<RowDataPacket[]>(
    "SELECT ROUND(latitude_aproximada,2) AS latitude,ROUND(longitude_aproximada,2) AS longitude," +
    "COUNT(*) AS total,SUM(tipo_ocorrencia='PERDIDO') AS perdidos,SUM(tipo_ocorrencia='ENCONTRADO') AS encontrados " +
    "FROM ocorrencias WHERE excluido_em IS NULL AND status_aprovacao='APROVADO' AND status_caso='ABERTO' " +
    "AND latitude_aproximada IS NOT NULL AND longitude_aproximada IS NOT NULL " +
    "GROUP BY ROUND(latitude_aproximada,2),ROUND(longitude_aproximada,2) ORDER BY total DESC LIMIT 100",
  );
  return rows;
}

export type AcaoModeracao = "APROVAR" | "REJEITAR" | "OCULTAR";
const estados = { APROVAR: "APROVADO", REJEITAR: "REJEITADO", OCULTAR: "OCULTO" } as const;

export async function moderarOcorrencia(
  id: number, acao: AcaoModeracao, motivo: string, idAdministrador: number,
): Promise<{ status: string } | { erro: string; codigo: number }> {
  const conn = await banco().getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute<RowDataPacket[]>(
      "SELECT status_aprovacao, status_caso, id_usuario_criador FROM ocorrencias WHERE id_ocorrencia=? AND excluido_em IS NULL FOR UPDATE", [id],
    );
    const anterior = rows[0];
    if (!anterior) {
      await conn.rollback();
      return { erro: "Ocorrência não encontrada.", codigo: 404 };
    }
    if ((acao === "APROVAR" || acao === "REJEITAR") && anterior.status_aprovacao !== "PENDENTE") {
      await conn.rollback();
      return { erro: "Somente solicitações pendentes podem ser aprovadas ou rejeitadas.", codigo: 409 };
    }
    if (acao === "APROVAR" && anterior.status_caso !== "ABERTO") {
      await conn.rollback();
      return { erro: "Este caso não está aberto.", codigo: 409 };
    }
    await conn.execute("UPDATE ocorrencias SET status_aprovacao=? WHERE id_ocorrencia=?", [estados[acao], id]);
    const historia = acao === "APROVAR" ? "APROVACAO" : acao === "REJEITAR" ? "REJEICAO" : "OCULTACAO";
    await conn.execute(
      "INSERT INTO historico_ocorrencias (id_ocorrencia,id_usuario_responsavel,acao,motivo,dados_anteriores,dados_novos) VALUES (?,?,?,?,?,?)",
      [id, idAdministrador, historia, motivo || null,
        JSON.stringify({ status_aprovacao: anterior.status_aprovacao }),
        JSON.stringify({ status_aprovacao: estados[acao] })],
    );
    await conn.execute(
      "INSERT INTO auditoria (id_usuario_responsavel,modulo,acao,entidade,id_registro,detalhe) VALUES (?,'RESGATE',?,'ocorrencias',?,?)",
      [idAdministrador, historia, id, motivo || null],
    );
    await conn.execute(
      "INSERT INTO notificacoes (id_usuario,modulo,tipo,id_ocorrencia,texto) VALUES (?,'RESGATE',?,?,?)",
      [Number(anterior.id_usuario_criador),
        acao === "APROVAR" ? "OCORRENCIA_APROVADA" : acao === "REJEITAR" ? "OCORRENCIA_REJEITADA" : "OCORRENCIA_OCULTA",
        id,
        acao === "APROVAR" ? "Sua ocorrência foi aprovada e está no mapa." :
          acao === "REJEITAR" ? "Sua ocorrência foi rejeitada. Veja o motivo em Minhas ocorrências." :
            "Sua ocorrência foi ocultada pela administração."],
    );
    await conn.commit();
    return { status: estados[acao] };
  } catch (error) {
    await conn.rollback().catch(() => undefined);
    throw error;
  } finally {
    conn.release();
  }
}

export async function consultarIndicadoresAdministrativos() {
  const [rows] = await banco().query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total, SUM(status_aprovacao='PENDENTE') AS pendentes, " +
    "SUM(status_aprovacao='APROVADO' AND status_caso='ABERTO') AS publicadas, " +
    "SUM(status_aprovacao='REJEITADO') AS rejeitadas " +
    "FROM ocorrencias WHERE excluido_em IS NULL",
  );
  return rows[0] || { total: 0, pendentes: 0, publicadas: 0, rejeitadas: 0 };
}
