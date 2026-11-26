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
    for (const cor of ["gray", "red", "green", "orange"]) {
      expect(css).toContain(`.custom-button.custom-button--${cor} { background:`);
    }
  });
});
