/* eslint-disable @typescript-eslint/no-require-imports -- Arquivos Jest em CommonJS. */
/* global describe, test, expect */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function carregarValidador() {
  const arquivo = path.join(__dirname, "../src/lib/situacao-lar-temporario.mjs");
  const fonte = fs.readFileSync(arquivo, "utf8");
  const codigo = ts.transpileModule(fonte, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const modulo = { exports: {} };
  vm.runInNewContext(codigo, { module: modulo, exports: modulo.exports, Set }, { filename: arquivo });
  return modulo.exports.validarSituacaoLarTemporario;
}

const validar = carregarValidador();

describe("Cadastro de animais encontrados", () => {
  test("aceita as duas opções de acolhimento temporário", () => {
    expect(validar("ENCONTRADO", "PODE_ACOLHER")).toBe("PODE_ACOLHER");
    expect(validar("ENCONTRADO", "NAO_PODE_ACOLHER")).toBe("NAO_PODE_ACOLHER");
  });

  test("não aceita opções ausentes ou inválidas", () => {
    for (const valor of [undefined, null, "", "OUTRO"]) {
      expect(validar("ENCONTRADO", valor)).toBeUndefined();
    }
  });

  test("não envia acolhimento para animal perdido", () => {
    expect(validar("PERDIDO", undefined)).toBeNull();
    expect(validar("PERDIDO", "PODE_ACOLHER")).toBeUndefined();
  });

  test("formulário envia a escolha que o backend exige", () => {
    const formulario = fs.readFileSync(path.join(__dirname,
      "../src/components/ocorrencias/FormularioOcorrencia.tsx"), "utf8");
    const api = fs.readFileSync(path.join(__dirname,
      "../src/app/api/ocorrencias/route.ts"), "utf8");
    expect(formulario).toContain('<select required value={situacaoLarTemporario}');
    expect(formulario).toContain('...(tipo === "ENCONTRADO" ? { situacaoLarTemporario } : {}),');
    expect(formulario).toContain('value="PODE_ACOLHER"');
    expect(formulario).toContain('value="NAO_PODE_ACOLHER"');
    expect(api).toContain("validarSituacaoLarTemporario(tipo, dados.situacaoLarTemporario)");
  });
});
