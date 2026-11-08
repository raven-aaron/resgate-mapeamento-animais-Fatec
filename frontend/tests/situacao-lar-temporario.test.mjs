import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validarSituacaoLarTemporario } from "../src/lib/situacao-lar-temporario.mjs";

const valoresValidos = ["PODE_ACOLHER", "NAO_PODE_ACOLHER"];

test("aceita cada situação válida somente para pet encontrado", () => {
  for (const valor of valoresValidos) {
    assert.equal(validarSituacaoLarTemporario("ENCONTRADO", valor), valor);
  }
});

test("rejeita situação ausente ou inválida para pet encontrado", () => {
  for (const valor of [undefined, null, "", "JA_ACOLHIDO", "OUTRO", 1, {}]) {
    assert.equal(validarSituacaoLarTemporario("ENCONTRADO", valor), undefined);
  }
});

test("mantém pet perdido sem situação e rejeita valores informados", () => {
  for (const valor of [undefined, null, ""]) {
    assert.equal(validarSituacaoLarTemporario("PERDIDO", valor), null);
  }
  for (const valor of valoresValidos) {
    assert.equal(validarSituacaoLarTemporario("PERDIDO", valor), undefined);
  }
});

test("migration preserva registros antigos e impede situação em pet perdido", async () => {
  const migration = await readFile(new URL("../../backend/database/migrations/005_situacao_lar_temporario.sql", import.meta.url), "utf8");
  assert.match(migration, /ADD COLUMN situacao_lar_temporario ENUM/i);
  assert.doesNotMatch(migration, /JA_ACOLHIDO/);
  assert.match(migration, /\)\s+NULL\b/i);
  assert.match(migration, /situacao_lar_temporario IS NULL\s+OR tipo_ocorrencia = 'ENCONTRADO'/i);
});

test("POST salva a situação e as consultas retornam o campo", async () => {
  const [route, consulta] = await Promise.all([
    readFile(new URL("../src/app/api/ocorrencias/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../src/lib/ocorrencias.ts", import.meta.url), "utf8"),
  ]);
  assert.match(route, /validarSituacaoLarTemporario\(tipo, dados\.situacaoLarTemporario\)/);
  assert.match(route, /situacao_lar_temporario\) VALUES/);
  assert.match(consulta, /o\.situacao_lar_temporario AS situacao_lar_temporario/);
});
