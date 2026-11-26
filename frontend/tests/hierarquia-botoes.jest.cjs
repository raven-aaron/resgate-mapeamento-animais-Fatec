/* eslint-disable @typescript-eslint/no-require-imports -- Jest usa CommonJS para ler arquivos no teste. */
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

function fonte(rel) {
  return readFileSync(join(__dirname, "..", rel), "utf8");
}

describe("hierarquia visual das ações de cadastro", () => {
  test("registro perdido e encontrado reutilizam o mesmo formulário com ações distintas", () => {
    const fonteRegistro = fonte("src/components/RegistroPetFinal.tsx");
    expect(fonte("src/app/registro-pet-perdido/page.tsx")).toContain('tipo="PERDIDO"');
    expect(fonte("src/app/registro-pet-encontrado/page.tsx")).toContain('tipo="ENCONTRADO"');
    expect(fonteRegistro).toContain('variant="green" disabled={formik.isSubmitting}');
    expect(fonteRegistro).toContain('variant="gray" onClick={() => setEtapa(');
    expect(fonteRegistro).toContain('variant="red" onClick={cancelarCadastro}>CANCELAR');
    expect(fonteRegistro).toContain('formik.dirty && !window.confirm(');
  });

  test("saída de formulário é vermelha, ação de salvar é verde", () => {
    const cadastro = fonte("src/components/ocorrencias/FormularioOcorrencia.tsx");
    const edicao = fonte("src/components/ocorrencias/EditarOcorrencia.tsx");
    expect(cadastro).toContain('href="/" variant="red">CANCELAR');
    expect(cadastro).toContain('variant="green" type="submit">REVISAR CADASTRO');
    expect(edicao).toContain('href="/minhas-ocorrencias" variant="red">CANCELAR');
    expect(edicao).toContain('type="submit" variant="green"');
    expect(cadastro).toContain('href="/cadastro" variant="green">CRIAR CONTA');
  });

  test("paleta de cores usa variantes reais e visíveis", () => {
    const css = fonte("src/app/globals.css");
    for (const cor of ["gray", "red", "green", "orange", "outline"]) {
      expect(css).toContain(`.custom-button.custom-button--${cor} { background:`);
    }
  });
});


describe("auditoria transversal de botões: navegação, ação e estado", () => {
  test("cada ação principal das minhas ocorrências tem variante semântica própria", () => {
    const pagina = fonte("src/app/minhas-ocorrencias/page.tsx");
    const acoes = fonte("src/components/ocorrencias/AcoesMinhaOcorrencia.tsx");
    expect(pagina).toContain('variant="orange">Ver publicação');
    expect(pagina).toContain('href="/mensagens" variant="gray">Minhas conversas');
    expect(pagina).toContain('href="/ocorrencias/nova" variant="green">CADASTRAR ANIMAL');
    expect(pagina).toContain('href="/mapa" variant="orange">Ver mapa público');
    expect(acoes).toContain('variant={statusAprovacao==="REJEITADO"?"orange":"gray"}');
    expect(acoes).toContain('variant="green" type="button"');
    expect(acoes).toContain('variant="red" onClick={()=>{');
    expect(acoes).toContain('variant={acao==="EXCLUIR"?"red":"green"}');
    expect(acoes).toContain('variant="gray" disabled={enviando}');
  });

  test("perfil e caixa de entrada distinguem destinos, permissão e filtros ativos", () => {
    const perfil = fonte("src/app/minha-conta/page.tsx");
    const inbox = fonte("src/components/chat/CaixaEntrada.tsx");
    const logout = fonte("src/components/auth/LogoutButton.tsx");
    expect(perfil).toContain('href="/admin" variant="gray">Voltar ao painel administrativo');
    expect(perfil).toContain('href="/minhas-ocorrencias" variant="orange"');
    expect(perfil).toContain('href="/notificacoes" variant="outline"');
    expect(inbox).toContain('href="/minha-conta" variant="gray">VOLTAR AO PERFIL');
    expect(inbox).toContain('href="/notificacoes" variant="orange">NOTIFICAÇÕES');
    expect(inbox).toContain('variant={!somenteNaoLidas?"green":"outline"}');
    expect(inbox).toContain('variant={somenteNaoLidas?"green":"outline"}');
    expect(logout).toContain('disabled={saindo} variant="red"');
  });

  test("botões de voltar são neutros; fechar menu não é uma ação destrutiva", () => {
    expect(fonte("src/app/recuperar-senha/page.tsx")).toContain('href="/login" variant="gray"');
    expect(fonte("src/app/servicos/[slug]/page.tsx")).toContain('href="/" variant="gray"');
    expect(fonte("src/app/admin/ocorrencias/[id]/page.tsx")).toContain('href="/admin/solicitacoes" variant="gray"');
    const cabecalho = fonte("src/components/layout/SiteChrome.tsx");
    expect(cabecalho).toContain('size="icon" variant="gray" aria-label="Fechar menu lateral"');
    expect(cabecalho).not.toContain('variant="red" aria-label="Fechar menu lateral"');
  });

  test("home tem CTAs destacados distintos e consulta pública diferencia navegação", () => {
    const home = fonte("src/app/page.tsx");
    const mapa = fonte("src/app/mapa/page.tsx");
    const cartaz = fonte("src/components/ocorrencias/CartazPet.tsx");
    const consulta = fonte("src/components/ocorrencias/ConsultaOcorrencias.tsx");
    expect(home).toContain('href="/registro-pet-perdido" variant="orange"');
    expect(home).toContain('href="/registro-pet-encontrado" variant="green"');
    expect(mapa).toContain('href="/animais" variant="orange"');
    expect(cartaz).toContain('href="/mapa" variant="orange"');
    expect(consulta).toContain('size="small" variant="outline" onClick={()=>setVersao');
    expect(consulta).toContain('variant={modo==="mapa"?"green":"gray"}');
    expect(consulta).toContain('variant={modo==="cards"?"green":"gray"}');
    expect(consulta).toContain('variant="orange">VER CARTAZ');
  });

  test("moderação mantém aprovar verde, rejeitar vermelho, detalhe laranja e ferramentas neutras", () => {
    const card = fonte("src/components/admin/CartaoOcorrenciaAdmin.tsx");
    const lista = fonte("src/components/admin/GerenciarOcorrencias.tsx");
    expect(card).toContain('variant="orange" fullWidth');
    expect(card).toContain('variant="green" onClick={aoAprovar}');
    expect(card).toContain('variant="red" onClick={aoRejeitar}');
    expect(lista).toContain('variant="gray" onClick={() => {');
    expect(lista).toContain('variant="outline" className={styles.botaoFiltro}');
    expect(lista).toContain('confirmacao.acao === "APROVAR" ? "green" : "red"');
    expect(lista).toContain('variant="gray" disabled={enviando}');
  });

  test("notificações distinguem ABRIR de MARCAR LIDA", () => {
    const avisos = fonte("src/components/notificacoes/PainelNotificacoes.tsx");
    expect(avisos).toContain('size="small" variant="outline">ABRIR');
    expect(avisos).toContain('size="small" variant="green" disabled={salvando}');
  });

  test("o estilo terciário outline está disponível, visível e acessível em alto contraste", () => {
    const componente = fonte("src/components/CustomButton.tsx");
    const css = fonte("src/app/globals.css");
    expect(componente).toContain('| "outline"');
    expect(css).toContain('.custom-button.custom-button--outline { background: transparent;');
    expect(css).toContain('.custom-button.custom-button--outline:focus-visible');
    expect(css).toContain('body.modo-alto-contraste .custom-button.custom-button--outline');
  });
});
