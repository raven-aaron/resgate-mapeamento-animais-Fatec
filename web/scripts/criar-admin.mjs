/**
 * Cria ou concede permissão de administrador RESGATE a uma conta.
 * No Docker Compose, execute: docker compose exec web node scripts/criar-admin.mjs
 * Também aceita ADMIN_NOME, ADMIN_EMAIL, ADMIN_SENHA via ambiente.
 * Execute dentro do container web. Não publique credenciais.
 */
import { randomBytes, scryptSync } from "node:crypto";
import mysql from "mysql2/promise";
import { createInterface } from "node:readline/promises";
import { execFileSync } from "node:child_process";

let nome = (process.env.ADMIN_NOME || "").trim();
let email = (process.env.ADMIN_EMAIL || "").trim().toLowerCase();
let senha = process.env.ADMIN_SENHA || "";

if ((!nome || !email || !senha) && process.stdin.isTTY) {
  const terminal = createInterface({ input: process.stdin, output: process.stdout });
  try {
    if (!nome) nome = (await terminal.question("Nome do administrador: ")).trim();
    if (!email) email = (await terminal.question("E-mail administrativo: ")).trim().toLowerCase();
    if (!senha) {
      let ocultou = false;
      try {
        execFileSync("stty", ["-echo"], { stdio: "inherit" });
        ocultou = true;
        senha = await terminal.question("Senha (mínimo 10 caracteres; não será exibida): ");
      } finally {
        if (ocultou) execFileSync("stty", ["echo"], { stdio: "inherit" });
        process.stdout.write("\n");
      }
    }
  } finally {
    terminal.close();
  }
}
if (nome.length < 2 || nome.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || senha.length < 10 || senha.length > 128) {
  console.error("Defina ADMIN_NOME, ADMIN_EMAIL e ADMIN_SENHA (10 a 128 caracteres) no ambiente.");
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
const hash = "scrypt$" + salt + "$" + scryptSync(senha, salt, 64).toString("hex");
const db = await mysql.createConnection({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || "3306"),
  database: process.env.DB_NAME || "resgate_animais",
  user: process.env.DB_USER || "resgate_app",
  password: process.env.DB_PASSWORD,
});
try {
  await db.beginTransaction();
  const [[existe]] = await db.execute("SELECT id_usuario FROM usuarios WHERE email = ? FOR UPDATE", [email]);
  let id;
  if (existe) {
    id = existe.id_usuario;
    await db.execute("UPDATE usuarios SET nome=?, senha_hash=?, situacao='ATIVO' WHERE id_usuario=?", [nome, hash, id]);
    await db.execute("UPDATE sessoes SET revogada_em=UTC_TIMESTAMP(3) WHERE id_usuario=? AND revogada_em IS NULL", [id]);
  } else {
    const [novo] = await db.execute("INSERT INTO usuarios (nome,email,senha_hash) VALUES (?,?,?)", [nome,email,hash]);
    id = novo.insertId;
  }
  await db.execute("INSERT IGNORE INTO permissoes_usuarios (id_usuario,modulo,papel) VALUES (?,'RESGATE','ADMIN')", [id]);
  await db.commit();
  console.log("Administrador RESGATE configurado. ID:", id);
} catch (error) {
  await db.rollback();
  console.error("Falha ao configurar administrador:", error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
