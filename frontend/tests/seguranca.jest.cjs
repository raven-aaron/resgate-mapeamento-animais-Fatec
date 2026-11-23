/* eslint-disable @typescript-eslint/no-require-imports -- Testes Jest em CommonJS. */
/* global describe, test, expect */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");

function carregarValidacaoDeOrigem() {
  const arquivo = path.join(__dirname, "../src/lib/seguranca.ts");
  const fonte = fs.readFileSync(arquivo, "utf8");
  const codigo = ts.transpileModule(fonte, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const modulo = { exports: {} };
  vm.runInNewContext(codigo, { exports: modulo.exports, module: modulo, URL }, { filename: arquivo });
  return modulo.exports.mesmaOrigem;
}

const mesmaOrigem = carregarValidacaoDeOrigem();

function requisicao({ host, origin, forwardedProto, url = "http://0.0.0.0:3000/api/ocorrencias" } = {}) {
  const headers = new Headers();
  if (host !== undefined) headers.set("host", host);
  if (origin !== undefined) headers.set("origin", origin);
  if (forwardedProto !== undefined) headers.set("x-forwarded-proto", forwardedProto);
  return new Request(url, { method: "POST", headers });
}

describe("Proteção de origem das rotas de escrita", () => {
  test("aceita requisição do mesmo host e porta", () => {
    expect(mesmaOrigem(requisicao({ host: "localhost:3000", origin: "http://localhost:3000" }))).toBe(true);
  });
  test("aceita o protocolo público HTTPS preservado pelo proxy", () => {
    expect(mesmaOrigem(requisicao({
      host: "animais.exemplo.org",
      origin: "https://animais.exemplo.org",
      forwardedProto: "https",
    }))).toBe(true);
  });
  test("rejeita origem de outro domínio", () => {
    expect(mesmaOrigem(requisicao({ host: "localhost:3000", origin: "https://exemplo-malicioso.org" }))).toBe(false);
  });
  test("rejeita porta diferente", () => {
    expect(mesmaOrigem(requisicao({ host: "localhost:3000", origin: "http://localhost:3001" }))).toBe(false);
  });
  test("rejeita requisição com Origin e sem Host", () => {
    expect(mesmaOrigem(requisicao({ origin: "http://localhost:3000" }))).toBe(false);
  });
  test("mantém compatibilidade com requisições de servidor sem Origin", () => {
    expect(mesmaOrigem(requisicao({ host: "localhost:3000" }))).toBe(true);
  });
  test("rejeita valor opaco no cabeçalho Origin", () => {
    expect(mesmaOrigem(requisicao({ host: "localhost:3000", origin: "null" }))).toBe(false);
  });
});
