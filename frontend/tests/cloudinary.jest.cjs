/* eslint-disable @typescript-eslint/no-require-imports -- Jest usa CommonJS para testes isolados. */
/* global describe, test, expect */
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const { createHash } = require("node:crypto");

const nome = "123e4567-e89b-12d3-a456-426614174000.jpg";
const publicId = "resgate-animais/" + nome.slice(0, -4);

function carregar(env, fetchMock) {
  const arquivo = join(__dirname, "../src/lib/storage-fotos.ts");
  const source = readFileSync(arquivo, "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const modulo = { exports: {} };
  const contexto = {
    module: modulo, exports: modulo.exports,
    require: (dep) => dep === "server-only" ? {} : require(dep),
    process: { env },
    fetch: fetchMock, Blob, FormData, AbortSignal, Uint8Array, ArrayBuffer, Buffer, URL, Date,
    console,
  };
  vm.runInNewContext(code, contexto, { filename: arquivo });
  return modulo.exports;
}

describe("Fotos hospedadas na Cloudinary", () => {
  test("upload autenticado, leitura por API assinada e exclusão, sem URL pública", async () => {
    const chamadas = [];
    const env = {
      VERCEL: "1", CLOUDINARY_CLOUD_NAME: "ambiente-teste",
      CLOUDINARY_API_KEY: "12345", CLOUDINARY_API_SECRET: "segredo-testes-nao-real",
    };
    const mock = async (url, opts) => {
      const u = new URL(url);
      chamadas.push({ u, opts });
      if (u.pathname.endsWith("/image/upload")) {
        return { ok: true, json: async () => ({ public_id: publicId, type: "authenticated" }) };
      }
      if (u.pathname.endsWith("/image/download")) {
        return { ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
      }
      if (u.pathname.endsWith("/image/destroy")) {
        return { ok: true, json: async () => ({ result: "ok" }) };
      }
      throw new Error("endpoint inesperado");
    };
    const armazenamento = carregar(env, mock);
    expect(await armazenamento.salvarFoto(nome, new Uint8Array([255, 216, 255]))).toBe("CLOUDINARY");
    expect(chamadas[0].u.hostname).toBe("api.cloudinary.com");
    expect(chamadas[0].opts.body.get("type")).toBe("authenticated");
    expect(chamadas[0].opts.body.get("public_id")).toBe(publicId);
    expect(chamadas[0].opts.headers.Authorization).toMatch(/^Basic /);

    const bytes = await armazenamento.lerFoto(nome, "CLOUDINARY");
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
    const params = chamadas[1].u.searchParams;
    expect(params.get("type")).toBe("authenticated");
    expect(params.get("public_id")).toBe(publicId);
    const assinar = ["format", "public_id", "timestamp", "type"]
      .sort().map(k => k + "=" + params.get(k)).join("&") + env.CLOUDINARY_API_SECRET;
    expect(params.get("signature")).toBe(createHash("sha1").update(assinar).digest("hex"));

    await armazenamento.excluirFoto(nome, "CLOUDINARY");
    expect(chamadas[2].opts.body.get("type")).toBe("authenticated");
    expect(chamadas[2].opts.body.get("public_id")).toBe(publicId);
  });

  test("informa o status HTTP da Cloudinary sem revelar credenciais", async () => {
    const env = {
      VERCEL: "1", CLOUDINARY_CLOUD_NAME: "ambiente-teste",
      CLOUDINARY_API_KEY: "12345", CLOUDINARY_API_SECRET: "segredo-testes-nao-real",
    };
    const armazenamento = carregar(env, async () => ({ ok: false, status: 403 }));
    const erro = await armazenamento.salvarFoto(nome, new Uint8Array([255, 216, 255]))
      .catch(error => error);
    expect(erro.message).toContain("HTTP 403");
    expect(erro.message).not.toContain(env.CLOUDINARY_API_SECRET);
  });

  test("edição envia fotos separadamente e limita 4 MB por arquivo na Vercel", () => {
    const editar = readFileSync(join(__dirname, "../src/components/ocorrencias/EditarOcorrencia.tsx"), "utf8");
    expect(editar).toContain("f.size>4*1024*1024");
    expect(editar).toContain("for(const foto of novasFotos)");
    expect(editar).toContain('body.append("fotos",foto)');
    expect(editar).not.toContain('novasFotos.forEach(f=>body.append("fotos",f))');
    expect(editar).toContain("setNovasFotos(novasFotos.slice(enviadas))");
  });

  test("cadastro informa falha parcial em vez de anunciar foto salva", () => {
    const form = readFileSync(join(__dirname, "../src/components/RegistroPetFinal.tsx"), "utf8");
    expect(form).toContain('titulo={erroEnvio ? "CADASTRO CRIADO, FOTO PENDENTE"');
    expect(form).toContain("a fotografia não foi salva");
    const card = readFileSync(join(__dirname, "../src/components/admin/CartaoOcorrenciaAdmin.tsx"), "utf8");
    expect(card).toContain("Foto não cadastrada");
    expect(card).not.toContain('ocorrencia.foto || "/assets/cachorrogatoinicial.jpg"');
  });

  test("não usa disco efêmero na Vercel quando Cloudinary está sem credenciais", async () => {
    const armazenamento = carregar({ VERCEL: "1" }, async () => { throw new Error("Não deve chamar rede"); });
    await expect(armazenamento.salvarFoto(nome, new Uint8Array([1]))).rejects.toThrow(
      "Configure a Cloudinary"
    );
  });

  test("não permite nomes externos, caminhos ou extensões fora do padrão", async () => {
    const armazenamento = carregar({ VERCEL: "1" }, async () => { throw new Error("Não deve chamar rede"); });
    await expect(armazenamento.salvarFoto("../segredo.jpg", new Uint8Array([1]))).rejects.toThrow(
      "Nome de fotografia inválido"
    );
  });

  test("rotas continuam validando a permissão antes de ler imagens", () => {
    const rota = readFileSync(join(__dirname, "../src/app/api/fotos/[arquivo]/route.ts"), "utf8");
    const modelo = readFileSync(join(__dirname, "../src/models/fotos-ocorrencia.ts"), "utf8");
    expect(rota.indexOf("buscarFotoCadastrada")).toBeLessThan(rota.indexOf("lerFoto("));
    expect(rota).toContain("administradorAtual()");
    expect(rota).toContain("status_aprovacao");
    expect(modelo).toContain("'CLOUDINARY'");
  });

  test("formulários enviam as fotografias separadamente, com limite de 4 MB", () => {
    const form = readFileSync(join(__dirname, "../src/components/ocorrencias/FormularioOcorrencia.tsx"), "utf8");
    const registro = readFileSync(join(__dirname, "../src/components/RegistroPetFinal.tsx"), "utf8");
    expect(form).toContain('formularioFoto.append("fotos", foto)');
    expect(form).toContain('"/api/ocorrencias/" + dados.id + "/fotos"');
    expect(form).not.toContain('fotos.forEach(foto => formulario.append("fotos", foto))');
    expect(form).toContain("4 * 1024 * 1024");
    expect(registro).toContain("4 * 1024 * 1024");
  });
});
