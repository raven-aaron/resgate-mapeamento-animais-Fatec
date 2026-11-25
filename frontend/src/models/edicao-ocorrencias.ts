import "server-only";
import type { PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { banco } from "../lib/db";
import type { localizarBairroPorCep } from "../lib/localizacao-cep";

type Linha = RowDataPacket & {
  id_animal: number; id_usuario_criador: number; id_especie: number;
  tipo_ocorrencia: "PERDIDO" | "ENCONTRADO";
  status_aprovacao: string; status_caso: string;
};
type Resultado = { mensagem: string } | { erro: string; status: number };
const nomeValido = /^[\p{L}\p{M}\s.'-]{0,80}$/u;

function texto(valor: unknown, max: number) {
  return typeof valor === "string" ? valor.trim().slice(0, max) : "";
}
function dataValida(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(valor + "T12:00:00Z");
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor &&
    valor <= new Date().toISOString().slice(0, 10);
}
async function proprietario(conn: PoolConnection, id: number, usuario: number) {
  const [linhas] = await conn.execute<Linha[]>(
    "SELECT o.id_animal,o.id_usuario_criador,o.tipo_ocorrencia,o.status_aprovacao,o.status_caso," +
    "a.id_especie FROM ocorrencias o JOIN animais a ON a.id_animal=o.id_animal " +
    "WHERE o.id_ocorrencia=? AND o.id_usuario_criador=? AND o.excluido_em IS NULL FOR UPDATE",
    [id, usuario],
  );
  return linhas[0] || null;
}
async function historico(conn: PoolConnection, id: number, usuario: number, acao: string,
  antes: Record<string, unknown>, depois: Record<string, unknown>, motivo: string | null = null) {
  await conn.execute(
    "INSERT INTO historico_ocorrencias " +
    "(id_ocorrencia,id_usuario_responsavel,acao,motivo,dados_anteriores,dados_novos) " +
    "VALUES (?,?,?,?,?,?)",
    [id, usuario, acao, motivo, JSON.stringify(antes), JSON.stringify(depois)],
  );
  await conn.execute(
    "INSERT INTO auditoria (id_usuario_responsavel,modulo,acao,entidade,id_registro,detalhe) " +
    "VALUES (?,'RESGATE',?,'ocorrencias',?,?)",
    [usuario, acao, id, motivo],
  );
}

export async function atualizarCadastroOcorrencia(
  id: number, idUsuario: number, acao: "EDITAR" | "ENCERRAR", dados: Record<string, unknown>,
  regiaoNova: Awaited<ReturnType<typeof localizarBairroPorCep>> | null,
): Promise<Resultado> {
  const conn = await banco().getConnection();
  let concluiu = false;
  try {
    await conn.beginTransaction();
    const o = await proprietario(conn, id, idUsuario);
    if (!o) return { erro: "Ocorrência não encontrada na sua conta.", status: 404 };
    if (o.status_caso !== "ABERTO") return { erro: "Esta ocorrência já foi encerrada.", status: 409 };

    if (acao === "ENCERRAR") {
      const motivo = texto(dados.motivo, 50);
      const detalhe = texto(dados.detalhe, 500);
      const motivos = ["REENCONTRADO", "DEVOLVIDO_AO_TUTOR", "DUPLICIDADE", "OUTRO"];
      if (!motivos.includes(motivo) ||
        (motivo === "REENCONTRADO" && o.tipo_ocorrencia !== "PERDIDO") ||
        (motivo === "DEVOLVIDO_AO_TUTOR" && o.tipo_ocorrencia !== "ENCONTRADO") ||
        (motivo === "OUTRO" && detalhe.length < 5)) {
        return { erro: "Selecione o motivo e forneça os detalhes necessários.", status: 400 };
      }
      const estado = motivo === "REENCONTRADO" || motivo === "DEVOLVIDO_AO_TUTOR" ? "RESOLVIDO" : "ENCERRADO";
      await conn.execute(
        "UPDATE ocorrencias SET status_caso=?,motivo_encerramento=?,detalhe_encerramento=?, " +
        "encerrado_em=UTC_TIMESTAMP(3) WHERE id_ocorrencia=?",
        [estado, motivo, detalhe || null, id],
      );
      await conn.execute(
        "UPDATE conversas SET situacao='ENCERRADA' WHERE id_ocorrencia=? AND situacao='ATIVA'", [id],
      );
      await historico(conn, id, idUsuario, "ENCERRAMENTO",
        { status_caso: o.status_caso }, { status_caso: estado }, motivo);
      await conn.commit();
      concluiu = true;
      return { mensagem: "Ocorrência encerrada com sucesso." };
    }

    if (!["PENDENTE", "REJEITADO", "APROVADO"].includes(o.status_aprovacao)) {
      return { erro: "Esta ocorrência não está disponível para edição.", status: 409 };
    }
    const nome = texto(dados.nome, 80);
    const sexo = texto(dados.sexo, 20);
    const porte = texto(dados.porte, 20);
    const idade = texto(dados.idade, 30);
    const microchip = o.tipo_ocorrencia === "PERDIDO" ? texto(dados.microchip, 10) : "";
    const raca = texto(dados.raca, 80);
    const cor = texto(dados.cor, 50);
    const descricao = texto(dados.descricao, 4000);
    const referencia = texto(dados.referencia, 255);
    const dataEvento = texto(dados.dataEvento, 10);
    if ((o.tipo_ocorrencia === "PERDIDO" && !nome) ||
      !nomeValido.test(nome) || !["", "MACHO", "FEMEA"].includes(sexo) ||
      !["", "PEQUENO", "MEDIO", "GRANDE"].includes(porte) ||
      !["", "SIM", "NAO"].includes(microchip) || !dataValida(dataEvento)) {
      return { erro: "Revise os campos e a data da ocorrência.", status: 400 };
    }
    if (/@|(?:\+?\d[\s().-]*){10,}/.test(descricao + " " + referencia)) {
      return { erro: "Não informe telefone, e-mail ou endereço residencial.", status: 400 };
    }
    let idRaca: number | null = null;
    if (raca) {
      const [racas] = await conn.execute<RowDataPacket[]>(
        "SELECT id_raca AS id FROM racas WHERE id_especie=? AND nome=? AND ativo=1 LIMIT 1",
        [o.id_especie, raca],
      );
      if (!racas.length) return { erro: "Raça inválida para a espécie.", status: 400 };
      idRaca = Number(racas[0].id);
    }
    let idCor: number | null = null;
    if (cor) {
      const [cores] = await conn.execute<RowDataPacket[]>(
        "SELECT id_cor AS id FROM cores WHERE nome=? AND ativo=1 LIMIT 1", [cor],
      );
      if (!cores.length) return { erro: "Cor inválida.", status: 400 };
      idCor = Number(cores[0].id);
    }
    await conn.execute(
      "UPDATE animais SET nome=?,sexo=?,porte=?,idade_aproximada=?,possui_microchip=?," +
      "id_raca=?,caracteristicas=? WHERE id_animal=?",
      [nome || null, sexo || "INDETERMINADO", porte || "INDETERMINADO", idade || null,
        microchip === "" ? null : microchip === "SIM" ? 1 : 0, idRaca, descricao || null, o.id_animal],
    );
    await conn.execute("DELETE FROM animais_cores WHERE id_animal=?", [o.id_animal]);
    if (idCor) await conn.execute(
      "INSERT INTO animais_cores (id_animal,id_cor) VALUES (?,?)", [o.id_animal, idCor],
    );
    if (regiaoNova) {
      const [bairros] = await conn.execute<ResultSetHeader>(
        "INSERT INTO bairros (nome,latitude_aproximada,longitude_aproximada) VALUES (?,?,?) " +
        "ON DUPLICATE KEY UPDATE id_bairro=LAST_INSERT_ID(id_bairro)," +
        "latitude_aproximada=VALUES(latitude_aproximada),longitude_aproximada=VALUES(longitude_aproximada)",
        [regiaoNova.bairro, regiaoNova.latitude, regiaoNova.longitude],
      );
      await conn.execute(
        "UPDATE ocorrencias SET id_bairro=?,cep=?,latitude_aproximada=?,longitude_aproximada=?," +
        "origem_localizacao='BAIRRO',precisao_localizacao='BAIRRO_APROXIMADO',logradouro=NULL " +
        "WHERE id_ocorrencia=?",
        [bairros.insertId, regiaoNova.cep, regiaoNova.latitude, regiaoNova.longitude, id],
      );
    }
    // Toda edição volta para análise antes de aparecer novamente no mapa público.
    await conn.execute(
      "UPDATE ocorrencias SET ponto_referencia=?,descricao=?,data_evento=?," +
      "status_aprovacao='PENDENTE' WHERE id_ocorrencia=?",
      [referencia || null, descricao || null, dataEvento, id],
    );
    await historico(conn, id, idUsuario, "EDICAO",
      { status_aprovacao: o.status_aprovacao },
      { status_aprovacao: "PENDENTE", campos_revisados: true });
    await conn.commit();
    concluiu = true;
    return { mensagem: "Alterações enviadas para nova análise." };
  } finally {
    if (!concluiu) await conn.rollback().catch(() => undefined);
    conn.release();
  }
}

export async function excluirCadastroOcorrencia(
  id: number, idUsuario: number,
): Promise<{ ok: true } | { erro: string; status: number }> {
  const conn = await banco().getConnection();
  let concluiu = false;
  try {
    await conn.beginTransaction();
    const o = await proprietario(conn, id, idUsuario);
    if (!o) return { erro: "Ocorrência não encontrada na sua conta.", status: 404 };
    await conn.execute("UPDATE ocorrencias SET excluido_em=UTC_TIMESTAMP(3) WHERE id_ocorrencia=?", [id]);
    await conn.execute("UPDATE conversas SET situacao='ENCERRADA' WHERE id_ocorrencia=? AND situacao='ATIVA'", [id]);
    await historico(conn, id, idUsuario, "EXCLUSAO",
      { excluido: false, status_aprovacao: o.status_aprovacao }, { excluido: true });
    await conn.commit();
    concluiu = true;
    return { ok: true };
  } finally {
    if (!concluiu) await conn.rollback().catch(() => undefined);
    conn.release();
  }
}

export type RegistroEdicaoOcorrencia = RowDataPacket & {
  id: number; tipo: "PERDIDO" | "ENCONTRADO"; status_aprovacao: string;
  status_caso: string; nome: string | null; especie: string; id_especie: number;
  sexo: string; porte: string; idade: string | null; microchip: number | null;
  raca: string | null; cor: string | null; data: string; descricao: string | null;
  referencia: string | null; bairro: string; cep: string | null;
};

export async function buscarDadosParaEditar(idOcorrencia: number, idUsuario: number) {
  const [registros] = await banco().execute<RegistroEdicaoOcorrencia[]>(
    "SELECT o.id_ocorrencia AS id,o.tipo_ocorrencia AS tipo,o.status_aprovacao,o.status_caso," +
    "a.nome,e.nome AS especie,a.id_especie,a.sexo,a.porte,a.idade_aproximada AS idade," +
    "a.possui_microchip AS microchip,r.nome AS raca," +
    "(SELECT c.nome FROM animais_cores ac JOIN cores c ON c.id_cor=ac.id_cor WHERE ac.id_animal=a.id_animal ORDER BY c.nome LIMIT 1) AS cor," +
    "o.data_evento AS data,o.descricao,o.ponto_referencia AS referencia,b.nome AS bairro,o.cep " +
    "FROM ocorrencias o JOIN animais a ON a.id_animal=o.id_animal " +
    "JOIN especies e ON e.id_especie=a.id_especie " +
    "JOIN bairros b ON b.id_bairro=o.id_bairro " +
    "LEFT JOIN racas r ON r.id_raca=a.id_raca " +
    "WHERE o.id_ocorrencia=? AND o.id_usuario_criador=? AND o.excluido_em IS NULL LIMIT 1",
    [idOcorrencia, idUsuario],
  );
  return registros[0] || null;
}

export async function buscarOpcoesParaEditar(idOcorrencia: number, idEspecie: number) {
  const [racas] = await banco().execute<RowDataPacket[]>(
    "SELECT nome FROM racas WHERE id_especie=? AND ativo=1 ORDER BY nome", [idEspecie],
  );
  const [cores] = await banco().execute<RowDataPacket[]>(
    "SELECT nome FROM cores WHERE ativo=1 ORDER BY nome",
  );
  const [fotos] = await banco().execute<RowDataPacket[]>(
    "SELECT id_foto AS id,url_foto AS url FROM fotos_ocorrencias WHERE id_ocorrencia=? ORDER BY ordem",
    [idOcorrencia],
  );
  return {
    racas: racas.map(r => String(r.nome)),
    cores: cores.map(c => String(c.nome)),
    fotos: fotos.map(f => ({ id: Number(f.id), url: String(f.url) })),
  };
}
