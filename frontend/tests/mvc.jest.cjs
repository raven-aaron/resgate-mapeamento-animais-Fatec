/* eslint-disable @typescript-eslint/no-require-imports -- Testes Jest em CommonJS. */
/* global describe, test, expect */
const { readdirSync, readFileSync } = require("node:fs");
const { join } = require("node:path");

const raiz = join(__dirname, "../src");

function arquivosRotas(pasta) {
  return readdirSync(pasta, { withFileTypes: true }).flatMap(item => {
    const caminho = join(pasta, item.name);
    if (item.isDirectory()) return arquivosRotas(caminho);
    return item.name === "route.ts" ? [caminho] : [];
  });
}

describe("Separação MVC", () => {
  test("controllers HTTP não fazem consultas SQL diretamente", () => {
    const rotas = arquivosRotas(join(raiz, "app/api"));
    expect(rotas.length).toBeGreaterThan(15);
    for (const arquivo of rotas) {
      const codigo = readFileSync(arquivo, "utf8");
      expect(codigo).not.toMatch(/from ["'][^"']*\/lib\/db["']/);
      expect(codigo).not.toMatch(/from ["']mysql2\/promise["']/);
      expect(codigo).not.toMatch(/\b(?:SELECT|INSERT INTO|DELETE FROM)\b/i);
    }
  });

  test("páginas principais usam models para ler dados", () => {
    for (const caminho of [
      "app/admin/page.tsx",
      "app/admin/usuarios/page.tsx",
      "app/minhas-ocorrencias/page.tsx",
      "app/minhas-ocorrencias/[id]/editar/page.tsx",
    ]) {
      const codigo = readFileSync(join(raiz, caminho), "utf8");
      expect(codigo).toContain("models/");
      expect(codigo).not.toContain("/lib/db");
    }
  });
});
