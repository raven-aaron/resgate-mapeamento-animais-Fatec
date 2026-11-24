import "server-only";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { banco } from "../lib/db";

export async function listarConversas(idUsuario: number) {
  const [rows] = await banco().execute<RowDataPacket[]>(
    "SELECT c.id_conversa AS id,c.situacao,o.id_ocorrencia AS ocorrencia,o.tipo_ocorrencia AS tipo," +
    "a.nome AS animal,e.nome AS especie," +
    "IF(c.id_usuario_interessado=?,dono.nome,interessado.nome) AS interlocutor," +
    "(SELECT m.conteudo FROM mensagens m WHERE m.id_conversa=c.id_conversa ORDER BY m.id_mensagem DESC LIMIT 1) AS ultimaMensagem," +
    "(SELECT m.enviado_em FROM mensagens m WHERE m.id_conversa=c.id_conversa ORDER BY m.id_mensagem DESC LIMIT 1) AS ultimaData," +
    "(SELECT COUNT(*) FROM mensagens m WHERE m.id_conversa=c.id_conversa AND m.id_remetente<>? AND m.lida_em IS NULL) AS naoLidas " +
    "FROM conversas c JOIN ocorrencias o ON o.id_ocorrencia=c.id_ocorrencia " +
    "JOIN animais a ON a.id_animal=o.id_animal JOIN especies e ON e.id_especie=a.id_especie " +
    "JOIN usuarios dono ON dono.id_usuario=o.id_usuario_criador " +
    "JOIN usuarios interessado ON interessado.id_usuario=c.id_usuario_interessado " +
    "WHERE (c.id_usuario_interessado=? OR o.id_usuario_criador=?) AND o.excluido_em IS NULL " +
    "ORDER BY c.atualizado_em DESC LIMIT 100",
    [idUsuario, idUsuario, idUsuario, idUsuario],
  );
  return rows;
}

export async function buscarOcorrenciaParaContato(id: number) {
  const [rows] = await banco().execute<RowDataPacket[]>(
    "SELECT id_usuario_criador,status_aprovacao,status_caso,excluido_em FROM ocorrencias WHERE id_ocorrencia=? LIMIT 1",
    [id],
  );
  return rows[0] || null;
}

export async function iniciarConversa(idOcorrencia: number, idUsuario: number) {
  await banco().execute(
    "INSERT INTO conversas (id_ocorrencia,id_usuario_interessado) VALUES (?,?) " +
    "ON DUPLICATE KEY UPDATE id_conversa=LAST_INSERT_ID(id_conversa)",
    [idOcorrencia, idUsuario],
  );
  const [rows] = await banco().execute<RowDataPacket[]>(
    "SELECT id_conversa AS id FROM conversas WHERE id_ocorrencia=? AND id_usuario_interessado=? LIMIT 1",
    [idOcorrencia, idUsuario],
  );
  return Number(rows[0]?.id);
}

export async function buscarConversaAutorizada(id: number, idUsuario: number) {
  const [rows] = await banco().execute<RowDataPacket[]>(
    "SELECT c.id_conversa,c.situacao,c.id_ocorrencia,o.status_aprovacao,o.status_caso,o.excluido_em," +
    "a.nome AS animal,o.tipo_ocorrencia AS tipo,interessado.nome AS interessado,dono.nome AS dono, " +
    "o.id_usuario_criador AS id_dono,c.id_usuario_interessado AS id_interessado " +
    "FROM conversas c JOIN ocorrencias o ON o.id_ocorrencia=c.id_ocorrencia " +
    "JOIN animais a ON a.id_animal=o.id_animal " +
    "JOIN usuarios dono ON dono.id_usuario=o.id_usuario_criador " +
    "JOIN usuarios interessado ON interessado.id_usuario=c.id_usuario_interessado " +
    "WHERE c.id_conversa=? AND (c.id_usuario_interessado=? OR o.id_usuario_criador=?) LIMIT 1",
    [id, idUsuario, idUsuario],
  );
  return rows[0] || null;
}

export async function listarMensagens(idConversa: number) {
  const [rows] = await banco().execute<RowDataPacket[]>(
    "SELECT m.id_mensagem AS id,m.conteudo,m.enviado_em AS data,m.id_remetente AS remetente,u.nome AS autor " +
    "FROM mensagens m JOIN usuarios u ON u.id_usuario=m.id_remetente " +
    "WHERE m.id_conversa=? ORDER BY m.id_mensagem DESC LIMIT 100",
    [idConversa],
  );
  return rows.reverse();
}

export async function marcarMensagensLidas(idConversa: number, idUsuario: number, ateId: number) {
  const conn = await banco().getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      "UPDATE mensagens SET lida_em=UTC_TIMESTAMP(3) WHERE id_conversa=? AND id_remetente<>? AND id_mensagem<=? AND lida_em IS NULL",
      [idConversa, idUsuario, ateId],
    );
    // Notificações só são marcadas até a última mensagem recebida que o usuário visualizou.
    await conn.execute(
      "UPDATE notificacoes SET lida_em=UTC_TIMESTAMP(3) WHERE id_conversa=? AND id_usuario=? AND tipo='NOVA_MENSAGEM' " +
      "AND lida_em IS NULL AND criado_em <= DATE_ADD((SELECT MAX(enviado_em) FROM mensagens " +
      "WHERE id_conversa=? AND id_remetente<>? AND id_mensagem<=?), INTERVAL 1 SECOND)",
      [idConversa, idUsuario, idConversa, idUsuario, ateId],
    );
    await conn.commit();
  } catch (error) {
    await conn.rollback().catch(() => undefined);
    throw error;
  } finally {
    conn.release();
  }
}

export async function contarMensagensRecentes(idConversa: number, idUsuario: number) {
  const [rows] = await banco().execute<RowDataPacket[]>(
    "SELECT COUNT(*) AS total FROM mensagens WHERE id_conversa=? AND id_remetente=? AND enviado_em >= DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 2 SECOND)",
    [idConversa, idUsuario],
  );
  return Number(rows[0]?.total || 0);
}

export async function enviarMensagem(
  idConversa: number, idUsuario: number, conteudo: string, destinatario: number, idOcorrencia: number,
) {
  const conn = await banco().getConnection();
  try {
    await conn.beginTransaction();
    const [ins] = await conn.execute<ResultSetHeader>(
      "INSERT INTO mensagens (id_conversa,id_remetente,conteudo) VALUES (?,?,?)",
      [idConversa, idUsuario, conteudo],
    );
    await conn.execute(
      "INSERT INTO notificacoes (id_usuario,modulo,tipo,id_ocorrencia,id_conversa,texto) " +
      "VALUES (?,'RESGATE','NOVA_MENSAGEM',?,?,'Você recebeu uma nova mensagem sobre um animal.')",
      [destinatario, idOcorrencia, idConversa],
    );
    await conn.commit();
    return ins.insertId;
  } catch (error) {
    await conn.rollback().catch(() => undefined);
    throw error;
  } finally {
    conn.release();
  }
}
