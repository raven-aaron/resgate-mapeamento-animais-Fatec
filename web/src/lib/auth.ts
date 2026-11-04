import "server-only";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import type { RowDataPacket } from "mysql2/promise";
import { banco } from "./db";

const scrypt = promisify(scryptCallback);
const COOKIE = "resgate_sessao";
const HORAS = 12;
const DIAS_LONGOS = 30;

export type UsuarioSessao = { id: number; nome: string; email: string; adminResgate: boolean };

export async function gerarSenhaHash(senha: string) {
  const salt = randomBytes(16).toString("hex");
  const chave = (await scrypt(senha, salt, 64)) as Buffer;
  return "scrypt$" + salt + "$" + chave.toString("hex");
}

export async function compararSenha(senha: string, hash: string) {
  const partes = hash.split("$");
  if (partes.length !== 3 || partes[0] !== "scrypt" || !/^[0-9a-f]{32}$/.test(partes[1]) || !/^[0-9a-f]{128}$/.test(partes[2])) return false;
  const esperado = Buffer.from(partes[2], "hex");
  const recebido = (await scrypt(senha, partes[1], esperado.length)) as Buffer;
  return timingSafeEqual(recebido, esperado);
}

export async function criarSessao(idUsuario: number, manterConectado = true) {
  const duracaoSegundos = manterConectado ? DIAS_LONGOS * 24 * 3600 : HORAS * 3600;
  const jar = await cookies();
  const tokenAnterior = jar.get(COOKIE)?.value;
  const token = randomBytes(32).toString("hex");
  const hashToken = createHash("sha256").update(token).digest("hex");
  await banco().execute(
    "INSERT INTO sessoes (id_usuario, token_hash, expira_em) VALUES (?, UNHEX(?), DATE_ADD(UTC_TIMESTAMP(3), INTERVAL ? SECOND))",
    [idUsuario, hashToken, duracaoSegundos]
  );
  // Impede que uma troca de conta mantenha uma sessão antiga válida no servidor.
  if(tokenAnterior && /^[a-f0-9]{64}$/.test(tokenAnterior)){
    const hashAnterior=createHash("sha256").update(tokenAnterior).digest("hex");
    await banco().execute("UPDATE sessoes SET revogada_em=UTC_TIMESTAMP(3) WHERE token_hash=UNHEX(?) AND revogada_em IS NULL",[hashAnterior]);
  }
  jar.set(COOKIE, token, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: duracaoSegundos,
  });
}

export async function encerrarSessao() {
  const token = (await cookies()).get(COOKIE)?.value;
  if (token && /^[a-f0-9]{64}$/.test(token)) {
    const hashToken = createHash("sha256").update(token).digest("hex");
    await banco().execute("UPDATE sessoes SET revogada_em = UTC_TIMESTAMP(3) WHERE token_hash = UNHEX(?) AND revogada_em IS NULL", [hashToken]);
  }
  (await cookies()).delete(COOKIE);
}

export async function usuarioAtual(): Promise<UsuarioSessao | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const hashToken = createHash("sha256").update(token).digest("hex");
  const sql = "SELECT u.id_usuario AS id, u.nome, u.email, " +
    "EXISTS(SELECT 1 FROM permissoes_usuarios p WHERE p.id_usuario = u.id_usuario AND p.modulo = 'RESGATE' AND p.papel = 'ADMIN') AS adminResgate " +
    "FROM sessoes s JOIN usuarios u ON u.id_usuario = s.id_usuario " +
    "WHERE s.token_hash = UNHEX(?) AND s.revogada_em IS NULL AND s.expira_em > UTC_TIMESTAMP(3) AND u.situacao = 'ATIVO' LIMIT 1";
  const [rows] = await banco().execute<RowDataPacket[]>(sql, [hashToken]);
  const usuario = rows[0];
  if (!usuario) return null;
  return { id: Number(usuario.id), nome: String(usuario.nome), email: String(usuario.email), adminResgate: Boolean(usuario.adminResgate) };
}
