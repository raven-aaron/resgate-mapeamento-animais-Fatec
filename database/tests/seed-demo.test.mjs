import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const script = new URL("../scripts/seed-demo.mjs",import.meta.url);
const arquivoInsomnia = new URL("../../insomnia/resgate-demo.insomnia-v4.json",import.meta.url);

test("dry-run gera plano de dados e não requer Docker nem credenciais", () => {
  const result = spawnSync(process.execPath,[script.pathname,
    "--dry-run","--count","36","--users","12","--chats","15","--seed","42"
  ],{encoding:"utf8",env:{PATH:process.env.PATH,HOME:process.env.HOME},timeout:60000});
  assert.equal(result.status,0,result.stderr);
  assert.match(result.stdout,/nenhuma escrita/);
  assert.match(result.stdout,/"usuarios": 12/);
  assert.match(result.stdout,/"ocorrencias": 36/);
  assert.match(result.stdout,/"conversas": 15/);
  assert.match(result.stdout,/"APROVADO": 24/);
});
test("--apply sem modo DEMO é recusado antes de qualquer conexão", () => {
  const result=spawnSync(process.execPath,[script.pathname,"--apply"],{
    encoding:"utf8",env:{PATH:process.env.PATH,HOME:process.env.HOME},timeout:5000
  });
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/RESGATE_DEMO=1/);
});
test("limites e argumentos incorretos são recusados", () => {
  const result=spawnSync(process.execPath,[script.pathname,"--dry-run","--count","999"],{
    encoding:"utf8",timeout:5000
  });
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/fora do intervalo/);
});
test("coleção nativa Insomnia v4 possui requests e IDs consistentes", () => {
  const conteudo=JSON.parse(readFileSync(arquivoInsomnia,"utf8"));
  assert.equal(conteudo.__export_format,4);
  assert.equal(conteudo._type,"export");
  const ids=new Set(conteudo.resources.map(x=>x._id));
  assert.equal(ids.size,conteudo.resources.length);
  for(const recurso of conteudo.resources){
    if(recurso.parentId)assert.ok(ids.has(recurso.parentId),"parentId inválido: "+recurso._id);
  }
  const reqs=conteudo.resources.filter(x=>x._type==="request");
  assert.ok(reqs.length>=25);
  assert.ok(reqs.some(x=>x.method==="POST" && x.url.endsWith("/api/auth/login")));
  assert.ok(reqs.some(x=>x.method==="POST" && x.url.endsWith("/api/ocorrencias")));
  assert.ok(reqs.some(x=>x.method==="PATCH" && x.url.endsWith("/api/admin/ocorrencias")));
  const env=conteudo.resources.find(x=>x._type==="environment");
  assert.equal(env.data.base_url,"http://localhost:3001");
  assert.equal(env.data.admin_senha,"");
  assert.equal(env.data.cidadao_senha,"");
  assert.ok(reqs.every(x=>x.url.includes("{{ _.base_url }}")));
});
