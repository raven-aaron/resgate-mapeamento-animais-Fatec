import "server-only";
import type { PoolConnection, RowDataPacket, ResultSetHeader } from "mysql2/promise";
import { banco } from "../lib/db";
import { salvarFoto, excluirFoto, type ProvedorFoto } from "../lib/storage-fotos";

type Arquivo = { nome: string; bytes: Uint8Array };
type FotoRetorno = { id: number; url: string };
type Resultado = { fotos: FotoRetorno[] } | { erro: string; status: number };
const formatoFoto = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;

async function acesso(conn: PoolConnection, id: number, userId: number) {
  const [rows] = await conn.execute<RowDataPacket[]>(
    "SELECT status_aprovacao,status_caso FROM ocorrencias " +
    "WHERE id_ocorrencia=? AND id_usuario_criador=? AND excluido_em IS NULL FOR UPDATE",
    [id, userId],
  );
  const o = rows[0];
  return o && o.status_caso === "ABERTO" &&
    ["PENDENTE", "REJEITADO", "APROVADO"].includes(o.status_aprovacao) ? o : null;
}
async function listar(conn: PoolConnection, id: number): Promise<FotoRetorno[]> {
  const [rows] = await conn.execute<RowDataPacket[]>(
    "SELECT id_foto AS id,url_foto AS url FROM fotos_ocorrencias WHERE id_ocorrencia=? ORDER BY ordem", [id],
  );
  return rows.map(f => ({ id: Number(f.id), url: String(f.url) }));
}
async function historico(conn: PoolConnection, id: number, userId: number, tipo: string, numero: number) {
  await conn.execute("UPDATE ocorrencias SET status_aprovacao='PENDENTE' WHERE id_ocorrencia=?", [id]);
  await conn.execute(
    "INSERT INTO historico_ocorrencias (id_ocorrencia,id_usuario_responsavel,acao,motivo,dados_novos) " +
    "VALUES (?,?,'EDICAO',?,?)",
    [id, userId, tipo, JSON.stringify({ fotos_alteradas: numero, status_aprovacao: "PENDENTE" })],
  );
  await conn.execute(
    "INSERT INTO auditoria (id_usuario_responsavel,modulo,acao,entidade,id_registro) " +
    "VALUES (?,'RESGATE','EDICAO_FOTOS','ocorrencias',?)", [userId, id],
  );
}

export async function adicionarFotosOcorrencia(
  id: number, usuario: number, arquivos: Arquivo[],
): Promise<Resultado> {
  const conn = await banco().getConnection();
  let concluiu = false;
  const criados: { nome: string; provedor: ProvedorFoto }[] = [];
  try {
    await conn.beginTransaction();
    if (!await acesso(conn, id, usuario)) return { erro: "Ocorrência não encontrada ou não editável.", status: 404 };
    const [existentes] = await conn.execute<RowDataPacket[]>(
      "SELECT ordem FROM fotos_ocorrencias WHERE id_ocorrencia=? ORDER BY ordem FOR UPDATE", [id],
    );
    if (existentes.length + arquivos.length > 5) {
      return { erro: "A ocorrência permite no máximo cinco fotos.", status: 409 };
    }
    const usadas = new Set(existentes.map(x => Number(x.ordem)));
    for (const arquivo of arquivos) {
      const ordem = [1, 2, 3, 4, 5].find(x => !usadas.has(x));
      if (!ordem) throw new Error("Limite de fotografias");
      usadas.add(ordem);
      const provedor = await salvarFoto(arquivo.nome, arquivo.bytes);
      criados.push({ nome: arquivo.nome, provedor });
      await conn.execute<ResultSetHeader>(
        "INSERT INTO fotos_ocorrencias (id_ocorrencia,provedor,identificador_arquivo,url_foto,ordem) " +
        "VALUES (?,?,?,?,?)",
        [id, provedor, arquivo.nome, "/api/fotos/" + arquivo.nome, ordem],
      );
    }
    await historico(conn, id, usuario, "Adição de fotografias", arquivos.length);
    await conn.commit();
    concluiu = true;
    return { fotos: await listar(conn, id) };
  } finally {
    if (!concluiu) {
      await conn.rollback().catch(() => undefined);
      await Promise.all(criados.map(foto =>
        excluirFoto(foto.nome, foto.provedor).catch(error => console.warn("Falha ao desfazer upload", error)),
      ));
    }
    conn.release();
  }
}

export async function removerFotoOcorrencia(
  id: number, usuario: number, idFoto: number,
): Promise<Resultado> {
  const conn = await banco().getConnection();
  let concluiu = false;
  try {
    await conn.beginTransaction();
    if (!await acesso(conn, id, usuario)) return { erro: "Ocorrência não encontrada ou não editável.", status: 404 };
    const [rows] = await conn.execute<RowDataPacket[]>(
      "SELECT provedor,identificador_arquivo FROM fotos_ocorrencias " +
      "WHERE id_ocorrencia=? AND id_foto=? FOR UPDATE", [id, idFoto],
    );
    if (!rows[0]) return { erro: "Fotografia não encontrada.", status: 404 };
    await conn.execute("DELETE FROM fotos_ocorrencias WHERE id_ocorrencia=? AND id_foto=?", [id, idFoto]);
    await historico(conn, id, usuario, "Remoção de fotografia", 1);
    await conn.commit();
    concluiu = true;
    const foto = rows[0];
    if (["LOCAL", "AZURE_BLOB"].includes(String(foto.provedor)) && formatoFoto.test(String(foto.identificador_arquivo))) {
      await excluirFoto(String(foto.identificador_arquivo), foto.provedor as ProvedorFoto)
        .catch(e => console.warn("Arquivo já indisponível após exclusão", e));
    }
    return { fotos: await listar(conn, id) };
  } finally {
    if (!concluiu) await conn.rollback().catch(() => undefined);
    conn.release();
  }
}

export async function buscarFotoCadastrada(arquivo: string) {
  const [rows] = await banco().execute<RowDataPacket[]>(
    "SELECT f.provedor,o.id_usuario_criador,o.status_aprovacao,o.status_caso,o.excluido_em " +
    "FROM fotos_ocorrencias f JOIN ocorrencias o ON o.id_ocorrencia=f.id_ocorrencia " +
    "WHERE f.provedor IN ('LOCAL','AZURE_BLOB') AND f.identificador_arquivo=? LIMIT 1",
    [arquivo],
  );
  return rows[0] || null;
}
