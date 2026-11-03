import "server-only";
import type { RowDataPacket } from "mysql2/promise";
import { banco } from "./db";

export type Ocorrencia = {
  id: number;
  nome: string | null;
  especie: string;
  sexo: string;
  porte: string;
  tipo: "PERDIDO" | "ENCONTRADO";
  bairro: string;
  data: string;
  descricao: string | null;
  referencia: string | null;
  latitude: number | null;
  longitude: number | null;
  foto: string | null;
  status_aprovacao?: string;
  status_caso?: string;
};

const colunas = [
  "SELECT o.id_ocorrencia AS id, a.nome, e.nome AS especie, a.sexo, a.porte,",
  "o.tipo_ocorrencia AS tipo, b.nome AS bairro, o.data_evento AS data,",
  "o.descricao, o.ponto_referencia AS referencia,",
  "ROUND(o.latitude_aproximada, 3) AS latitude, ROUND(o.longitude_aproximada, 3) AS longitude,",
  "(SELECT f.url_foto FROM fotos_ocorrencias f WHERE f.id_ocorrencia=o.id_ocorrencia ORDER BY f.ordem ASC LIMIT 1) AS foto,",
  "o.status_aprovacao, o.status_caso",
  "FROM ocorrencias o",
  "JOIN animais a ON a.id_animal = o.id_animal",
  "JOIN especies e ON e.id_especie = a.id_especie",
  "JOIN bairros b ON b.id_bairro = o.id_bairro",
].join(" ");

export async function buscarPublicas(filtros: { especie?: string; porte?: string; sexo?: string; tipo?: string } = {}): Promise<Ocorrencia[]> {
  const where = ["o.status_aprovacao='APROVADO'", "o.status_caso='ABERTO'", "o.excluido_em IS NULL"];
  const valores: (string | number)[] = [];
  if (filtros.especie && ["Cachorro", "Gato"].includes(filtros.especie)) {
    where.push("e.nome = ?"); valores.push(filtros.especie);
  }
  if (filtros.porte && ["PEQUENO", "MEDIO", "GRANDE"].includes(filtros.porte)) {
    where.push("a.porte = ?"); valores.push(filtros.porte);
  }
  if (filtros.sexo && ["MACHO", "FEMEA"].includes(filtros.sexo)) {
    where.push("a.sexo = ?"); valores.push(filtros.sexo);
  }
  if (filtros.tipo && ["PERDIDO", "ENCONTRADO"].includes(filtros.tipo)) {
    where.push("o.tipo_ocorrencia = ?"); valores.push(filtros.tipo);
  }
  const query = colunas + " WHERE " + where.join(" AND ") + " ORDER BY o.criado_em DESC LIMIT 200";
  const [rows] = await banco().execute<RowDataPacket[]>(query, valores);
  return rows as Ocorrencia[];
}

export async function buscarPublicaPorId(id: number): Promise<Ocorrencia | null> {
  const [rows] = await banco().execute<RowDataPacket[]>(
    colunas + " WHERE o.id_ocorrencia = ? AND o.status_aprovacao='APROVADO' AND o.status_caso='ABERTO' AND o.excluido_em IS NULL LIMIT 1",
    [id]
  );
  return (rows[0] as Ocorrencia) || null;
}

export async function buscarAdministrativas(status: string): Promise<Ocorrencia[]> {
  const filtro = status === "TODAS" ? "" : " AND o.status_aprovacao=?";
  const [rows] = await banco().execute<RowDataPacket[]>(
    colunas + " WHERE o.excluido_em IS NULL" + filtro + " ORDER BY o.criado_em DESC LIMIT 200",
    status === "TODAS" ? [] : [status]
  );
  return rows as Ocorrencia[];
}
