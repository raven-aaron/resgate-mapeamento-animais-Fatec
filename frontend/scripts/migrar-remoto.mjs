/**
 * Migrações para um MySQL remoto. Execução manual a partir de frontend/,
 * com DATABASE_URL configurada localmente. Nunca é executado no build.
 * As instruções DELIMITER do MySQL CLI são interpretadas antes do envio,
 * permitindo CREATE TRIGGER com BEGIN/END e multipleStatements=false.
 */
import mysql from "mysql2/promise";
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

export function dividirInstrucoes(sql) {
  const comandos = [];
  let delimitador = ";";
  let buffer = "";
  for (const linha of sql.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").split("\n")) {
    const novoDelimitador = /^\s*DELIMITER\s+(\S+)\s*$/i.exec(linha);
    if (novoDelimitador) {
      if (buffer.trim()) throw new Error("DELIMITER no meio de uma instrução SQL.");
      delimitador = novoDelimitador[1];
      continue;
    }
    buffer += linha + "\n";
    const ateAgora = buffer.trimEnd();
    if (!ateAgora.endsWith(delimitador)) continue;
    const comando = ateAgora.slice(0, -delimitador.length).trim();
    if (comando) comandos.push(comando);
    buffer = "";
  }
  if (buffer.trim()) throw new Error("Migração SQL termina com instrução incompleta.");
  return comandos;
}

async function migrar() {
  const ajuda = "Uso: node scripts/migrar-remoto.mjs [--status | --help]";
  const args = process.argv.slice(2);
  if (args.includes("--help")) { console.log(ajuda); return; }
  if (args.length > 1 || (args.length === 1 && args[0] !== "--status")) {
    throw new Error(ajuda);
  }
  const uri = process.env.DATABASE_URL?.trim();
  if (!uri || !/^mysql:\/\//.test(uri)) {
    throw new Error("DATABASE_URL MySQL ausente. Use um arquivo .env.remoto local, nunca o GitHub.");
  }
  const dir = resolve(fileURLToPath(new URL("../../backend/database/migrations/", import.meta.url)));
  const arquivos = readdirSync(dir).filter(nome => nome.endsWith(".sql")).sort();
  if (!arquivos.length) throw new Error("Nenhuma migração SQL encontrada.");
  const vistos = new Set();
  const migracoes = arquivos.map(arquivo => {
    if (!/^\d{3}_[a-z0-9_]+\.sql$/.test(arquivo) || vistos.has(arquivo.slice(0,3))) {
      throw new Error("Migração com nome/número inválido: " + arquivo);
    }
    vistos.add(arquivo.slice(0, 3));
    const sql = readFileSync(resolve(dir, arquivo), "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
    return { arquivo, hash: createHash("sha256").update(sql).digest("hex"), comandos: dividirInstrucoes(sql) };
  });

  const conexao = await mysql.createConnection({
    uri,
    ssl: { rejectUnauthorized: true },
    connectTimeout: 45000,
    multipleStatements: false,
  });
  let travado = false;
  try {
    const [[versao]] = await conexao.query("SELECT VERSION() AS versao");
    if (!String(versao.versao).startsWith("8.4.")) {
      throw new Error("MySQL 8.4 exigido; servidor retornou " + String(versao.versao));
    }
    const [[controle]] = await conexao.query(
      "SELECT COUNT(*) AS qtd FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='controle_migracoes'"
    );
    const temControle = Number(controle.qtd) === 1;
    const [aplicadas] = temControle
      ? await conexao.query("SELECT arquivo,resumo_sha256,situacao FROM controle_migracoes ORDER BY arquivo")
      : [[]];
    for (let i = 0; i < aplicadas.length; i++) {
      const atual = aplicadas[i], esperada = migracoes[i];
      if (!esperada || atual.arquivo !== esperada.arquivo || atual.resumo_sha256 !== esperada.hash ||
          atual.situacao !== "APLICADA") {
        throw new Error("Histórico de migrações divergente ou incompleto. Não prossiga sem backup.");
      }
    }
    const pendentes = migracoes.slice(aplicadas.length);
    if (args[0] === "--status") {
      for (const m of migracoes) console.log((pendentes.includes(m) ? "PENDENTE " : "APLICADA ") + m.arquivo);
      return;
    }
    const [[trava]] = await conexao.query("SELECT GET_LOCK(CONCAT('resgate:', LEFT(SHA2(DATABASE(),256),50)), 0) AS trava");
    if (Number(trava.trava) !== 1) throw new Error("Outro migrador está executando neste banco.");
    travado = true;
    if (!temControle) {
      const [[tabelas]] = await conexao.query(
        "SELECT COUNT(*) AS qtd FROM information_schema.tables WHERE table_schema=DATABASE() AND table_type='BASE TABLE'"
      );
      if (Number(tabelas.qtd) !== 0) {
        throw new Error("Banco contém tabelas sem histórico de migração. Não será alterado.");
      }
      await conexao.query(`CREATE TABLE controle_migracoes (
        arquivo VARCHAR(150) PRIMARY KEY,
        resumo_sha256 CHAR(64) NOT NULL,
        situacao ENUM('EM_EXECUCAO','APLICADA') NOT NULL,
        iniciado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        aplicado_em DATETIME(3) NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
    }
    await conexao.query("SET time_zone = '+00:00'");
    await conexao.query(
      "SET SESSION sql_mode = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION,ONLY_FULL_GROUP_BY,NO_ZERO_IN_DATE,NO_ZERO_DATE'"
    );
    for (const m of pendentes) {
      await conexao.execute(
        "INSERT INTO controle_migracoes (arquivo,resumo_sha256,situacao) VALUES (?,?,'EM_EXECUCAO')",
        [m.arquivo, m.hash]
      );
      for (const comando of m.comandos) await conexao.query(comando);
      await conexao.execute(
        "UPDATE controle_migracoes SET situacao='APLICADA',aplicado_em=UTC_TIMESTAMP(3) WHERE arquivo=?",
        [m.arquivo]
      );
      console.log("Aplicada: " + m.arquivo);
    }
    if (!pendentes.length) console.log("Banco atualizado; nenhuma migração pendente.");
  } finally {
    if (travado) {
      await conexao.query("SELECT RELEASE_LOCK(CONCAT('resgate:', LEFT(SHA2(DATABASE(),256),50)))").catch(() => {});
    }
    await conexao.end();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  migrar().catch(error => {
    console.error("Migração remota interrompida: " + error.message);
    console.error("Não apague tabelas ou histórico; em caso de falha, inspecione e use backup.");
    process.exitCode = 1;
  });
}
