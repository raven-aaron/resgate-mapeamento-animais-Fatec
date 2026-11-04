import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { consultar } from './mysql.mjs';

const ajuda = 'Uso: node database/scripts/migrar.mjs [--status | --help]';
const argumentos = process.argv.slice(2);
if (argumentos.includes('--help')) {
  console.log(ajuda);
  process.exit(0);
}
if (argumentos.length > 1 || (argumentos.length === 1 && argumentos[0] !== '--status')) {
  console.error(ajuda);
  process.exit(1);
}

try {
  const versao = consultar('SELECT VERSION();');
  if (!versao.startsWith('8.4.')) throw new Error(`Esperado MySQL 8.4; encontrado ${versao}.`);
  const pasta = new URL('../migrations/', import.meta.url);
  const arquivos = readdirSync(pasta).filter(nome => nome.endsWith('.sql')).sort();
  if (!arquivos.length) throw new Error('Nenhuma migração encontrada.');
  const numeros = new Set();
  const migracoes = arquivos.map(nome => {
    if (!/^\d{3}_[a-z0-9_]+\.sql$/.test(nome)) throw new Error(`Nome de migração inválido: ${nome}`);
    if (numeros.has(nome.slice(0, 3))) throw new Error(`Número de migração repetido: ${nome}`);
    numeros.add(nome.slice(0, 3));
    const sql = readFileSync(new URL(nome, pasta), 'utf8').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
    return { nome, sql, resumo: createHash('sha256').update(sql).digest('hex') };
  });
  const temControle = consultar("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'controle_migracoes';") === '1';
  const linhas = temControle ? consultar('SELECT arquivo, resumo_sha256, situacao FROM controle_migracoes ORDER BY arquivo;') : '';
  const aplicadas = linhas ? linhas.split('\n').map(linha => linha.split('\t')) : [];
  for (const [indice, [arquivo, resumo, situacao]] of aplicadas.entries()) {
    const esperada = migracoes[indice];
    if (!esperada || esperada.nome !== arquivo) throw new Error(`Histórico fora de ordem ou arquivo removido: ${arquivo}.`);
    if (esperada.resumo !== resumo) throw new Error(`Migração já registrada foi modificada: ${arquivo}. Crie uma nova migração.`);
    if (situacao !== 'APLICADA') throw new Error(`Migração incompleta: ${arquivo}. Inspecione o banco e prepare recuperação; não apague volumes ou linhas de controle.`);
  }
  const pendentes = migracoes.slice(aplicadas.length);
  if (argumentos[0] === '--status') {
    for (const m of migracoes) console.log(`${pendentes.includes(m) ? 'PENDENTE' : 'APLICADA'} ${m.nome}`);
    process.exit(0);
  }
  if (!pendentes.length) {
    console.log('Banco atualizado; nenhuma migração executada.');
    process.exit(0);
  }
  if (!temControle && consultar("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE';") !== '0') {
    throw new Error('O banco já contém tabelas sem controle de migração. Não será sobrescrito. É necessário planejar uma conversão com backup.');
  }

  // Uma única conexão mantém o GET_LOCK por toda a execução. Sem --force:
  // o cliente MySQL termina no primeiro erro. Fechar a conexão libera a trava.
  const partes = [
    "SELECT GET_LOCK(CONCAT('resgate:', LEFT(SHA2(DATABASE(), 256), 50)), 0) INTO @trava;",
    'CREATE TEMPORARY TABLE validar_migracao (ok TINYINT NOT NULL, CONSTRAINT ck_validar_migracao CHECK (ok = 1));',
    'INSERT INTO validar_migracao VALUES (IF(@trava = 1, 1, 0));',
  ];
  if (!temControle) {
    partes.push("INSERT INTO validar_migracao SELECT IF(COUNT(*) = 0, 1, 0) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE';");
    partes.push(`CREATE TABLE controle_migracoes (
      arquivo VARCHAR(150) PRIMARY KEY,
      resumo_sha256 CHAR(64) NOT NULL,
      situacao ENUM('EM_EXECUCAO', 'APLICADA') NOT NULL,
      iniciado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      aplicado_em DATETIME(3) NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  } else {
    partes.push(`INSERT INTO validar_migracao SELECT IF(COUNT(*) = ${aplicadas.length}, 1, 0) FROM controle_migracoes;`);
    for (const [arquivo, resumo] of aplicadas) {
      // Nome e resumo foram comparados com o manifesto local validado acima.
      partes.push(`INSERT INTO validar_migracao SELECT IF(COUNT(*) = 1, 1, 0) FROM controle_migracoes WHERE arquivo = '${arquivo}' AND resumo_sha256 = '${resumo}' AND situacao = 'APLICADA';`);
    }
  }
  for (const m of pendentes) {
    partes.push(`INSERT INTO controle_migracoes (arquivo, resumo_sha256, situacao) VALUES ('${m.nome}', '${m.resumo}', 'EM_EXECUCAO');`);
    partes.push('START TRANSACTION;', m.sql);
    partes.push(`UPDATE controle_migracoes SET situacao = 'APLICADA', aplicado_em = CURRENT_TIMESTAMP(3) WHERE arquivo = '${m.nome}';`, 'COMMIT;');
  }
  consultar(partes.join('\n') + '\n', { administrador: true });
  for (const m of pendentes) console.log(`Aplicada: ${m.nome}`);
} catch (erro) {
  console.error(`Migração interrompida: ${erro.message}`);
  console.error('DDL no MySQL pode permanecer aplicado após erro. Corrija com inspeção e backup; não use --force nem apague o volume.');
  process.exitCode = 1;
}
