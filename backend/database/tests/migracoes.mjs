import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { consultar, raiz } from '../scripts/mysql.mjs';

if (process.env.BANCO_TESTE !== '1') throw new Error('Exige BANCO_TESTE=1 e ambiente descartável.');
const executar = () => {
  try {
    return execFileSync(process.execPath, ['backend/database/scripts/migrar.mjs'], {
      cwd: raiz, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch (erro) {
    throw new Error(erro.stderr?.toString() || erro.message);
  }
};
const quantidadeMigracoes = readdirSync(new URL('../migrations/', import.meta.url))
  .filter((nome) => /^\d+_.*\.sql$/.test(nome)).length;
assert.equal(Number(consultar("SELECT COUNT(*) FROM controle_migracoes WHERE situacao = 'APLICADA';")), quantidadeMigracoes);
const antes = consultar('SELECT arquivo, resumo_sha256, aplicado_em FROM controle_migracoes ORDER BY arquivo;');
assert.match(executar(), /nenhuma migração executada/);
assert.equal(consultar('SELECT arquivo, resumo_sha256, aplicado_em FROM controle_migracoes ORDER BY arquivo;'), antes);
console.log('OK: nova execução preserva histórico e não reaplica migrações.');

const arquivo = new URL('../migrations/002_catalogos.sql', import.meta.url);
const original = readFileSync(arquivo);
try {
  writeFileSync(arquivo, Buffer.concat([original, Buffer.from('\n-- alteração indevida de teste\n')]));
  assert.throws(executar, /Migração já registrada foi modificada/);
  console.log('OK: migração aplicada não pode ser silenciosamente alterada.');
} finally {
  writeFileSync(arquivo, original);
}

try {
  consultar("UPDATE controle_migracoes SET situacao = 'EM_EXECUCAO' WHERE arquivo = '002_catalogos.sql';");
  assert.throws(executar, /Migração incompleta/);
  console.log('OK: migração incompleta exige recuperação explícita.');
} finally {
  consultar("UPDATE controle_migracoes SET situacao = 'APLICADA' WHERE arquivo = '002_catalogos.sql';");
}
assert.equal(consultar('SELECT arquivo, resumo_sha256, aplicado_em FROM controle_migracoes ORDER BY arquivo;'), antes);
