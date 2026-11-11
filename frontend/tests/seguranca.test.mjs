import test from "node:test";
import assert from "node:assert/strict";
import { mesmaOrigem } from "../src/lib/seguranca.ts";

function requisicao({ host, origin, url="http://0.0.0.0:3000/api/auth/cadastro", forwardedProto } = {}) {
  const headers = new Headers();
  if (host !== undefined) headers.set("host", host);
  if (origin !== undefined) headers.set("origin", origin);
  if (forwardedProto !== undefined) headers.set("x-forwarded-proto", forwardedProto);
  return new Request(url, { method:"POST", headers });
}

test("aceita cadastro local com Host localhost e URL interna do Docker", () => {
  assert.equal(mesmaOrigem(requisicao({ host:"localhost:3000", origin:"http://localhost:3000" })), true);
});
test("aceita acesso por 127.0.0.1", () => {
  assert.equal(mesmaOrigem(requisicao({ host:"127.0.0.1:3000", origin:"http://127.0.0.1:3000" })), true);
});
test("aceita HTTPS com proxy reverso preservando Host", () => {
  assert.equal(mesmaOrigem(requisicao({
    host:"animais.exemplo.org", origin:"https://animais.exemplo.org", forwardedProto:"https"
  })), true);
});
test("rejeita origem de site diferente", () => {
  assert.equal(mesmaOrigem(requisicao({ host:"localhost:3000", origin:"https://malicioso.exemplo" })), false);
});
test("rejeita porta diferente", () => {
  assert.equal(mesmaOrigem(requisicao({ host:"localhost:3000", origin:"http://localhost:3001" })), false);
});
test("rejeita protocolo diferente", () => {
  assert.equal(mesmaOrigem(requisicao({ host:"localhost:3000", origin:"https://localhost:3000" })), false);
});
test("rejeita origem opaca e Host ausente", () => {
  assert.equal(mesmaOrigem(requisicao({ host:"localhost:3000", origin:"null" })), false);
  assert.equal(mesmaOrigem(requisicao({ origin:"http://localhost:3000" })), false);
});
test("preserva chamadas sem Origin", () => {
  assert.equal(mesmaOrigem(requisicao({ host:"localhost:3000" })), true);
});
