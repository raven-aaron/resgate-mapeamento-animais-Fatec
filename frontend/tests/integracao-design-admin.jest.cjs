/* eslint-disable @typescript-eslint/no-require-imports -- Testes Jest em CommonJS. */
/* global describe, test, expect */
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const fonte = (caminho) => readFileSync(join(__dirname, "..", caminho), "utf8");

describe("Integração do design administrativo da Bianca", () => {
  test("layout administrativo preserva login privado e permissão", () => {
    const site = fonte("src/components/FinalSiteShell.tsx");
    expect(site).toContain('pathname !== "/admin/login"');
    expect(site).toContain("if (rotaAdmin) return <>{children}</>");
    expect(fonte("src/app/admin/page.tsx")).toContain("if (!usuario?.adminResgate)");
  });
  test("dashboard usa os componentes da Bianca com o modelo MVC atualizado", () => {
    const pagina = fonte("src/app/admin/page.tsx");
    expect(pagina).toContain("consultarIndicadoresAdministrativos()");
    expect(pagina).toContain("<SecaoCards");
    expect(pagina).toContain('href="/admin/solicitacoes"');
    expect(pagina).not.toContain("banco().query");
  });
  test("menu mantém moderação, mensagens, notificações e logout real", () => {
    const menu = fonte("src/components/admin/menuAdmin.tsx");
    const shell = fonte("src/components/admin/AdminShell.tsx");
    for (const rota of [
      "/admin/solicitacoes", "/admin/ocorrencias", "/admin/estatisticas",
      "/admin/mapa-termico", "/admin/usuarios", "/mensagens", "/notificacoes",
    ]) expect(menu).toContain(rota);
    expect(shell).toContain('LogoutButton administrativo destino="/admin/login"');
    expect(shell).toContain("inert={!menuAberto}");
    expect(shell).toContain('aria-current={itemAtivo(href) ? "page" : undefined}');
  });
  test("não desfaz hierarquia pública de botões", () => {
    const btn = fonte("src/components/CustomButton.tsx");
    const css = fonte("src/app/globals.css");
    expect(btn).toContain('"outline" | "admin"');
    expect(css).toContain(".custom-button.custom-button--outline");
    expect(fonte("src/components/admin/AdminShell.module.css")).toContain(".custom-button--admin");
  });
});
