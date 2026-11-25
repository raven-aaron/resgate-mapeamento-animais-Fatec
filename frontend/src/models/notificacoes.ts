import "server-only";
import type { RowDataPacket } from "mysql2/promise";
import { banco } from "../lib/db";

export async function consultarNotificacoes(idUsuario: number) {
  const [avisos] = await banco().execute<RowDataPacket[]>(
    "SELECT id_notificacao AS id,tipo,texto,id_ocorrencia AS ocorrencia,id_conversa AS conversa," +
    "criado_em AS data,lida_em AS lida FROM notificacoes WHERE id_usuario=? " +
    "ORDER BY id_notificacao DESC LIMIT 60", [idUsuario],
  );
  const [contadores] = await banco().execute<RowDataPacket[]>(
    "SELECT (SELECT COUNT(*) FROM notificacoes WHERE id_usuario=? AND lida_em IS NULL) AS avisos," +
    "(SELECT COUNT(*) FROM mensagens m JOIN conversas c ON c.id_conversa=m.id_conversa " +
    "JOIN ocorrencias o ON o.id_ocorrencia=c.id_ocorrencia " +
    "WHERE (o.id_usuario_criador=? OR c.id_usuario_interessado=?) " +
    "AND m.id_remetente<>? AND m.lida_em IS NULL) AS mensagens," +
    "(SELECT COALESCE(MAX(m.id_mensagem),0) FROM mensagens m " +
    "JOIN conversas c ON c.id_conversa=m.id_conversa " +
    "JOIN ocorrencias o ON o.id_ocorrencia=c.id_ocorrencia " +
    "WHERE (o.id_usuario_criador=? OR c.id_usuario_interessado=?) " +
    "AND m.id_remetente<>? AND m.lida_em IS NULL) AS ultimaMensagemNaoLida",
    [idUsuario, idUsuario, idUsuario, idUsuario, idUsuario, idUsuario, idUsuario],
  );
  return {
    notificacoes: avisos,
    naoLidas: Number(contadores[0]?.avisos || 0),
    mensagensNaoLidas: Number(contadores[0]?.mensagens || 0),
    ultimaMensagemNaoLida: Number(contadores[0]?.ultimaMensagemNaoLida || 0),
  };
}

export async function marcarNotificacoesLidas(idUsuario: number, idNotificacao?: number) {
  if (idNotificacao === undefined) {
    await banco().execute(
      "UPDATE notificacoes SET lida_em=UTC_TIMESTAMP(3) WHERE id_usuario=? AND lida_em IS NULL",
      [idUsuario],
    );
  } else {
    await banco().execute(
      "UPDATE notificacoes SET lida_em=UTC_TIMESTAMP(3) WHERE id_usuario=? AND id_notificacao=? AND lida_em IS NULL",
      [idUsuario, idNotificacao],
    );
  }
}
