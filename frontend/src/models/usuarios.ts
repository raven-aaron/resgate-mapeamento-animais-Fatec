import "server-only";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { banco } from "../lib/db";

export type AcaoPermissao = "CONCEDER_ADMIN" | "REVOGAR_ADMIN";

export async function criarUsuario(nome: string, email: string, telefone: string, senhaHash: string): Promise<number> {
  const [resultado] = await banco().execute<ResultSetHeader>(
    "INSERT INTO usuarios (nome,email,telefone,senha_hash) VALUES (?,?,?,?)",
    [nome, email, telefone, senhaHash],
  );
  return resultado.insertId;
}

export async function buscarUsuarioAtivoPorEmail(email: string) {
  const [linhas] = await banco().execute<RowDataPacket[]>(
    "SELECT u.id_usuario AS id, u.nome, u.senha_hash, " +
    "EXISTS(SELECT 1 FROM permissoes_usuarios p WHERE p.id_usuario = u.id_usuario AND p.modulo = 'RESGATE' AND p.papel = 'ADMIN') AS adminResgate " +
    "FROM usuarios u WHERE u.email = ? AND u.situacao = 'ATIVO' LIMIT 1",
    [email],
  );
  return linhas[0] || null;
}

export async function alterarPermissaoResgate(
  id: number, acao: AcaoPermissao, confirmacao: string, idAdministrador: number,
): Promise<{ ok: true } | { erro: string; status: number }> {
  const conn = await banco().getConnection();
  try {
    await conn.beginTransaction();
    const [linhas] = await conn.execute<RowDataPacket[]>(
      "SELECT id_usuario,email,situacao FROM usuarios WHERE id_usuario=? FOR UPDATE", [id],
    );
    const alvo = linhas[0];
    if (!alvo) {
      await conn.rollback();
      return { erro: "Conta não encontrada.", status: 404 };
    }
    if (String(alvo.email).toLowerCase() !== confirmacao) {
      await conn.rollback();
      return { erro: "O e-mail de confirmação não corresponde à conta.", status: 400 };
    }
    // Bloqueia as permissões durante a operação para preservar pelo menos um administrador.
    const [admins] = await conn.execute<RowDataPacket[]>(
      "SELECT p.id_usuario FROM permissoes_usuarios p " +
      "JOIN usuarios u ON u.id_usuario=p.id_usuario " +
      "WHERE p.modulo='RESGATE' AND p.papel='ADMIN' AND u.situacao='ATIVO' FOR UPDATE",
    );
    if (!admins.some(a => Number(a.id_usuario) === idAdministrador)) {
      await conn.rollback();
      return { erro: "Sua permissão administrativa foi alterada. Entre novamente.", status: 403 };
    }
    const alvoAdmin = admins.some(a => Number(a.id_usuario) === id);
    const ativo = String(alvo.situacao) === "ATIVO";
    const podeConceder = acao === "CONCEDER_ADMIN" && ativo && !alvoAdmin;
    const podeRevogar = acao === "REVOGAR_ADMIN" && ativo && alvoAdmin && admins.length > 1;
    if (!podeConceder && !podeRevogar) {
      await conn.rollback();
      return { erro: "Ação não permitida. A conta deve estar ativa e ao menos um administrador deve permanecer.", status: 409 };
    }
    if (podeConceder) {
      await conn.execute(
        "INSERT INTO permissoes_usuarios (id_usuario,modulo,papel) VALUES (?,'RESGATE','ADMIN')", [id],
      );
    } else {
      await conn.execute(
        "DELETE FROM permissoes_usuarios WHERE id_usuario=? AND modulo='RESGATE'", [id],
      );
    }
    await conn.execute(
      "UPDATE sessoes SET revogada_em=UTC_TIMESTAMP(3) WHERE id_usuario=? AND revogada_em IS NULL", [id],
    );
    await conn.execute(
      "INSERT INTO auditoria (id_usuario_responsavel,modulo,acao,entidade,id_registro,detalhe) " +
      "VALUES (?,'CONTAS',?,'usuarios',?,'Gestão administrativa auditada no Resgate')",
      [idAdministrador, acao, id],
    );
    await conn.commit();
    return { ok: true };
  } catch (error) {
    await conn.rollback().catch(() => undefined);
    throw error;
  } finally {
    conn.release();
  }
}
