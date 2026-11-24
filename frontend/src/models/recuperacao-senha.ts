import "server-only";
import type { RowDataPacket } from "mysql2/promise";
import { banco } from "../lib/db";

export async function buscarContaParaRecuperacao(nome: string, email: string): Promise<number | null> {
  const [rows] = await banco().execute<RowDataPacket[]>(
    "SELECT id_usuario FROM usuarios WHERE nome=? AND email=? AND situacao='ATIVO' LIMIT 1",
    [nome, email],
  );
  return rows.length ? Number(rows[0].id_usuario) : null;
}

export async function registrarTokenRecuperacao(idUsuario: number, hashToken: string) {
  await banco().execute(
    "INSERT INTO recuperacoes_senha (id_usuario,token_hash,expira_em) VALUES (?,UNHEX(?),DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 30 MINUTE))",
    [idUsuario, hashToken],
  );
}

export async function redefinirSenha(hashToken: string, novaSenha: string): Promise<boolean> {
  const conn = await banco().getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.execute<RowDataPacket[]>(
      "SELECT r.id_recuperacao,r.id_usuario FROM recuperacoes_senha r JOIN usuarios u ON u.id_usuario=r.id_usuario " +
      "WHERE r.token_hash=UNHEX(?) AND r.utilizado_em IS NULL AND r.expira_em>UTC_TIMESTAMP(3) AND u.situacao='ATIVO' FOR UPDATE",
      [hashToken],
    );
    if (!rows.length) {
      await conn.rollback();
      return false;
    }
    const id = Number(rows[0].id_usuario);
    await conn.execute("UPDATE usuarios SET senha_hash=? WHERE id_usuario=?", [novaSenha, id]);
    await conn.execute(
      "UPDATE recuperacoes_senha SET utilizado_em=UTC_TIMESTAMP(3) WHERE id_recuperacao=?",
      [Number(rows[0].id_recuperacao)],
    );
    await conn.execute(
      "UPDATE sessoes SET revogada_em=UTC_TIMESTAMP(3) WHERE id_usuario=? AND revogada_em IS NULL",
      [id],
    );
    await conn.commit();
    return true;
  } catch (error) {
    await conn.rollback().catch(() => undefined);
    throw error;
  } finally {
    conn.release();
  }
}
