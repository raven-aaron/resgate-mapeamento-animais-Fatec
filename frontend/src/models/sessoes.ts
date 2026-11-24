import "server-only";
import type { RowDataPacket } from "mysql2/promise";
import { banco } from "../lib/db";

export async function registrarSessao(idUsuario: number, hash: string, duracaoSegundos: number, hashAnterior: string | null) {
  const conn = await banco().getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      "INSERT INTO sessoes (id_usuario,token_hash,expira_em) VALUES (?,UNHEX(?),DATE_ADD(UTC_TIMESTAMP(3),INTERVAL ? SECOND))",
      [idUsuario, hash, duracaoSegundos],
    );
    if (hashAnterior) {
      await conn.execute(
        "UPDATE sessoes SET revogada_em=UTC_TIMESTAMP(3) WHERE token_hash=UNHEX(?) AND revogada_em IS NULL",
        [hashAnterior],
      );
    }
    await conn.commit();
  } catch (error) {
    await conn.rollback().catch(() => undefined);
    throw error;
  } finally {
    conn.release();
  }
}

export async function revogarSessao(hash: string) {
  await banco().execute(
    "UPDATE sessoes SET revogada_em=UTC_TIMESTAMP(3) WHERE token_hash=UNHEX(?) AND revogada_em IS NULL",
    [hash],
  );
}

export async function buscarUsuarioDaSessao(hash: string) {
  const [linhas] = await banco().execute<RowDataPacket[]>(
    "SELECT u.id_usuario AS id,u.nome,u.email," +
    "EXISTS(SELECT 1 FROM permissoes_usuarios p WHERE p.id_usuario=u.id_usuario AND p.modulo='RESGATE' AND p.papel='ADMIN') AS adminResgate " +
    "FROM sessoes s JOIN usuarios u ON u.id_usuario=s.id_usuario " +
    "WHERE s.token_hash=UNHEX(?) AND s.revogada_em IS NULL AND s.expira_em>UTC_TIMESTAMP(3) AND u.situacao='ATIVO' LIMIT 1",
    [hash],
  );
  return linhas[0] || null;
}
