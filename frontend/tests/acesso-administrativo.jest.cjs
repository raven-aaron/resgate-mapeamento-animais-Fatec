/* eslint-disable @typescript-eslint/no-require-imports -- Testes Jest em CommonJS. */
/* global describe, test, expect */
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

function fonte(relativo) {
  return readFileSync(join(__dirname, "..", relativo), "utf8");
}

describe("Acesso administrativo fora da interface pública", () => {
  test("o endereço de entrada do cidadão não oferece seleção administrativa", () => {
    const entrada = fonte("src/app/entrar/page.tsx");
    expect(entrada).toContain('redirect("/login")');
    expect(entrada).not.toContain("/admin/login");
  });

  test("o formulário de login público não revela link de administração", () => {
    const login = fonte("src/app/login/page.tsx");
    expect(login).not.toContain('href="/admin/login"');
  });

  test("a rota direta de administração mantém formulário próprio e evita indexação", () => {
    const admin = fonte("src/app/admin/login/page.tsx");
    expect(admin).toContain("<LoginForm admin");
    expect(admin).toContain("index: false");
  });

  test("o servidor exige permissão administrativa e usa sessão separada", () => {
    const autenticacao = fonte("src/lib/auth.ts");
    const api = fonte("src/app/api/admin/usuarios/route.ts");
    expect(autenticacao).toContain('administrador:"resgate_admin_sessao"');
    expect(api).toContain("administradorAtual()");
    expect(api).toContain("!solicitante?.adminResgate");
  });

  test("o administrador é provisionado por script privado, sem senha padrão", () => {
    const script = fonte("scripts/criar-admin.mjs");
    expect(script).toContain("ADMIN_SENHA");
    expect(script).toContain("permissoes_usuarios");
    expect(script).toContain("scryptSync(senha");
  });
});
