import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { dividirInstrucoes } from "../scripts/migrar-remoto.mjs";

const pasta = resolve(fileURLToPath(new URL("../../backend/database/migrations/", import.meta.url)));

test("migrações existentes são divididas em comandos MySQL completos", () => {
  const arquivos = readdirSync(pasta).filter(nome => nome.endsWith(".sql")).sort();
  assert.equal(arquivos.length, 5);
  const quantidadeEsperada = [23, 3, 2, 2, 1];
  arquivos.forEach((arquivo, indice) => {
    const comandos = dividirInstrucoes(readFileSync(resolve(pasta, arquivo), "utf8"));
    assert.equal(comandos.length, quantidadeEsperada[indice], arquivo);
    for (const comando of comandos) {
      assert.ok(!comando.includes("DELIMITER $$"), arquivo);
      assert.ok(comando.trim().length > 8, arquivo);
    }
    if (indice === 0) {
      assert.equal(comandos.filter(c => c.startsWith("CREATE TRIGGER")).length, 6);
      assert.ok(comandos.some(c => c.includes("CREATE TABLE fotos_ocorrencias")));
    }
  });
});

test("não ignora SQL incompleto ou DELIMITER no meio da instrução", () => {
  assert.throws(() => dividirInstrucoes("CREATE TABLE exemplo (id INT)"), /incompleta/);
  assert.throws(() => dividirInstrucoes("SELECT 1\nDELIMITER $$"), /DELIMITER/);
});
