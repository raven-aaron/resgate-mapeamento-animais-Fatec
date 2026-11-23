/* global describe, test, expect */
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

function metodosExportados(caminho) {
  const fonte = fs.readFileSync(caminho, "utf8");
  const arvore = ts.createSourceFile(caminho, fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return arvore.statements.filter((no) =>
    ts.isFunctionDeclaration(no) &&
    no.modifiers?.some((modificador) => modificador.kind === ts.SyntaxKind.ExportKeyword)
  ).map((no) => no.name?.text);
}

describe("Métodos REST da API de ocorrências", () => {
  test("a listagem oferece GET e o cadastro oferece POST", () => {
    const rota = path.join(__dirname, "../src/app/api/ocorrencias/route.ts");
    expect(metodosExportados(rota)).toEqual(expect.arrayContaining(["GET", "POST"]));
  });
  test("uma ocorrência oferece GET, PUT, PATCH e DELETE", () => {
    const rota = path.join(__dirname, "../src/app/api/ocorrencias/[id]/route.ts");
    expect(metodosExportados(rota)).toEqual(expect.arrayContaining(["GET", "PUT", "PATCH", "DELETE"]));
  });
});
