import "server-only";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { banco } from "../lib/db";
import type { localizarBairroPorCep } from "../lib/localizacao-cep";
import type { ProvedorFoto } from "../lib/storage-fotos";

type DadosCadastro = {
  idUsuario: number;
  tipo: string; especie: string; nome: string; raca: string; cor: string;
  sexo: string; porte: string; microchip: string; idade: string;
  descricao: string; referencia: string; dataEvento: string; cep: string;
  situacaoLarTemporario: string | null;
  endereco: Awaited<ReturnType<typeof localizarBairroPorCep>>;
  fotos: { nome: string; provedor: ProvedorFoto; ordem: number }[];
};

export async function cadastrarOcorrencia(dados: DadosCadastro):
  Promise<{ id: number } | { erro: string; status: number }> {
  const {
    idUsuario, tipo, especie, nome, raca, cor, sexo, porte, microchip, idade,
    descricao, referencia, dataEvento, cep, situacaoLarTemporario, endereco, fotos,
  } = dados;
  const conn = await banco().getConnection();
  let concluido = false;
  try {
    await conn.beginTransaction();
    const [bairros] = await conn.execute<ResultSetHeader>(
      "INSERT INTO bairros (nome,latitude_aproximada,longitude_aproximada) VALUES (?,?,?) ON DUPLICATE KEY UPDATE id_bairro=LAST_INSERT_ID(id_bairro),latitude_aproximada=VALUES(latitude_aproximada),longitude_aproximada=VALUES(longitude_aproximada)",
      [endereco.bairro, endereco.latitude, endereco.longitude],
    );
    const [especies] = await conn.execute<RowDataPacket[]>(
      "SELECT id_especie AS id FROM especies WHERE nome=? AND ativo=1 LIMIT 1", [especie],
    );
    const idEspecie = Number(especies[0]?.id);
    if (!idEspecie) throw new Error("Espécie não cadastrada");
    let idRaca: number | null = null;
    if (raca) {
      const [racas] = await conn.execute<RowDataPacket[]>(
        "SELECT id_raca AS id FROM racas WHERE id_especie=? AND nome=? AND ativo=1 LIMIT 1",
        [idEspecie, raca],
      );
      if (!racas.length) return { erro: "Raça inválida para a espécie.", status: 400 };
      idRaca = Number(racas[0].id);
    }
    const [animal] = await conn.execute<ResultSetHeader>(
      "INSERT INTO animais (nome,id_especie,id_raca,sexo,porte,possui_microchip,idade_aproximada,caracteristicas) VALUES (?,?,?,?,?,?,?,?)",
      [nome || null, idEspecie, idRaca, sexo || "INDETERMINADO", porte || "INDETERMINADO",
        microchip === "" ? null : microchip === "SIM" ? 1 : 0, idade || null, descricao || null],
    );
    const [ocorrencia] = await conn.execute<ResultSetHeader>(
      "INSERT INTO ocorrencias (id_usuario_criador,id_animal,id_bairro,ponto_referencia,tipo_ocorrencia,status_aprovacao,data_evento,descricao,cep,logradouro,latitude_aproximada,longitude_aproximada,origem_localizacao,precisao_localizacao,situacao_lar_temporario) VALUES (?,?,?,?,?,'PENDENTE',?,?,?,?,?,?,?,?,?)",
      [idUsuario, animal.insertId, bairros.insertId, referencia || null, tipo, dataEvento,
        descricao || null, cep, null, endereco.latitude, endereco.longitude,
        "BAIRRO", "BAIRRO_APROXIMADO", situacaoLarTemporario],
    );
    if (cor) {
      const [cores] = await conn.execute<RowDataPacket[]>(
        "SELECT id_cor AS id FROM cores WHERE nome=? AND ativo=1 LIMIT 1", [cor],
      );
      if (!cores.length) throw new Error("Cor não cadastrada");
      await conn.execute(
        "INSERT INTO animais_cores (id_animal,id_cor) VALUES (?,?)", [animal.insertId, Number(cores[0].id)],
      );
    }
    for (const foto of fotos) {
      await conn.execute(
        "INSERT INTO fotos_ocorrencias (id_ocorrencia,provedor,identificador_arquivo,url_foto,ordem) VALUES (?,?,?,?,?)",
        [ocorrencia.insertId, foto.provedor, foto.nome, "/api/fotos/" + foto.nome, foto.ordem],
      );
    }
    await conn.execute(
      "INSERT INTO historico_ocorrencias (id_ocorrencia,id_usuario_responsavel,acao) VALUES (?,?,'CRIACAO')",
      [ocorrencia.insertId, idUsuario],
    );
    await conn.commit();
    concluido = true;
    return { id: ocorrencia.insertId };
  } finally {
    if (!concluido) await conn.rollback().catch(() => undefined);
    conn.release();
  }
}

export type MinhaOcorrencia = RowDataPacket & {
  id: number; nome: string | null; especie: string; bairro: string;
  tipo: "PERDIDO" | "ENCONTRADO"; status_aprovacao: string; status_caso: string;
  motivo_rejeicao: string | null; foto: string | null; data: string;
};

export async function listarMinhasOcorrencias(idUsuario: number) {
  const [rows] = await banco().execute<MinhaOcorrencia[]>(
    "SELECT o.id_ocorrencia AS id, a.nome,e.nome AS especie,b.nome AS bairro,o.tipo_ocorrencia AS tipo," +
    "o.status_aprovacao,o.status_caso,o.data_evento AS data," +
    "(SELECT h.motivo FROM historico_ocorrencias h WHERE h.id_ocorrencia=o.id_ocorrencia AND h.acao='REJEICAO' ORDER BY h.id_historico DESC LIMIT 1) AS motivo_rejeicao," +
    "(SELECT f.url_foto FROM fotos_ocorrencias f WHERE f.id_ocorrencia=o.id_ocorrencia ORDER BY f.ordem LIMIT 1) AS foto " +
    "FROM ocorrencias o JOIN animais a ON a.id_animal=o.id_animal JOIN especies e ON e.id_especie=a.id_especie " +
    "JOIN bairros b ON b.id_bairro=o.id_bairro WHERE o.id_usuario_criador=? AND o.excluido_em IS NULL ORDER BY o.criado_em DESC LIMIT 100",
    [idUsuario],
  );
  return rows;
}
