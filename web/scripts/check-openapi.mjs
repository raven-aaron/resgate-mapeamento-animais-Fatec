import { readFileSync, readdirSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const arquivo = resolve(raiz, "public/openapi.json");
const pastaRotas = resolve(raiz, "src/app/api");
const contrato = JSON.parse(readFileSync(arquivo, "utf8"));
assert.equal(contrato.openapi, "3.0.3", "Versão OpenAPI esperada");
assert.ok(contrato.info?.title && contrato.info?.version, "Cabeçalho da especificação ausente");
assert.ok(contrato.components?.schemas && contrato.components?.securitySchemes, "Componentes ausentes");

const metodos = new Set(["get", "post", "patch", "delete", "put", "head", "options"]);
const implementados = new Set();
function percorrer(diretorio) {
  for (const item of readdirSync(diretorio, { withFileTypes: true })) {
    const caminho = join(diretorio, item.name);
    if (item.isDirectory()) { percorrer(caminho); continue; }
    if (item.name !== "route.ts") continue;
    const codigo = readFileSync(caminho, "utf8");
    const caminhoHttp = "/api/" + relative(pastaRotas, dirname(caminho))
      .replaceAll("\\", "/").replace(/\[([^\]]+)\]/g, "{$1}");
    for (const achado of codigo.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(/g)) {
      implementados.add(achado[1].toLowerCase() + " " + caminhoHttp);
    }
  }
}
percorrer(pastaRotas);

const documentados = new Set();
const ids = new Set();
for (const [path, operations] of Object.entries(contrato.paths ?? {})) {
  assert.ok(path.startsWith("/api/"), "Caminho inesperado: " + path);
  for (const [method, operation] of Object.entries(operations)) {
    if (!metodos.has(method)) continue;
    const chave = method + " " + path;
    assert.ok(!documentados.has(chave), "Operação repetida: " + chave);
    assert.ok(operation.operationId && operation.summary && operation.tags?.length, "Faltam metadados: " + chave);
    assert.ok(operation.responses && Object.keys(operation.responses).length, "Faltam respostas: " + chave);
    assert.ok(!ids.has(operation.operationId), "operationId repetido: " + operation.operationId);
    ids.add(operation.operationId);
    documentados.add(chave);
  }
}

const faltantes = [...implementados].filter(k => !documentados.has(k));
const inventados = [...documentados].filter(k => !implementados.has(k));
assert.deepEqual(faltantes, [], "Rotas implementadas sem documentação");
assert.deepEqual(inventados, [], "Operações documentadas que não existem no código");

function checarRefs(valor) {
  if (!valor || typeof valor !== "object") return;
  if (Array.isArray(valor)) { valor.forEach(checarRefs); return; }
  if (valor.$ref) {
    const partes = valor.$ref.split("/");
    assert.ok(partes.length === 4 && partes[0] === "#" && partes[1] === "components", "Referência externa inesperada: " + valor.$ref);
    assert.ok(contrato.components[partes[2]]?.[partes[3]], "Schema referenciado não existe: " + valor.$ref);
  }
  if (valor.type === "null") throw Error("type:null não existe em OpenAPI 3.0.3");
  Object.values(valor).forEach(checarRefs);
}
checarRefs(contrato);
console.log("OK: OpenAPI 3.0.3 com " + documentados.size + " operações sincronizadas com " + implementados.size + " handlers reais; referências internas válidas.");
