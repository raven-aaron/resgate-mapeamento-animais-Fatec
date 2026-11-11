import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const script = new URL("../scripts/seed-demo.mjs",import.meta.url);
const caminhoScript = fileURLToPath(script);
const arquivoInsomnia = new URL("../../insomnia/resgate-demo.insomnia-v4.json",import.meta.url);

test("dry-run gera plano de dados e não requer Docker nem credenciais", () => {
  const result = spawnSync(process.execPath,[caminhoScript,
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
  const result=spawnSync(process.execPath,[caminhoScript,"--apply"],{
    encoding:"utf8",env:{PATH:process.env.PATH,HOME:process.env.HOME},timeout:5000
  });
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/RESGATE_DEMO=1/);
});
test("limites e argumentos incorretos são recusados", () => {
  const result=spawnSync(process.execPath,[caminhoScript,"--dry-run","--count","999"],{
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


test("15 bairros reais de Votorantim possuem CEP de logradouro, fontes e georreferência", async () => {
  const {BAIRROS_DEMO,regiaoDemo,coordenadaDemo}=await import("../../../frontend/scripts/demo-localidades.mjs");
  assert.equal(BAIRROS_DEMO.length,15);
  assert.equal(new Set(BAIRROS_DEMO.map(b=>b.nome)).size,15);
  assert.equal(new Set(BAIRROS_DEMO.map(b=>b.cep)).size,15);
  for(const bairro of BAIRROS_DEMO){
    assert.match(bairro.cep,/^181\d{5}$/);
    assert.ok(bairro.latitude< -23.52 && bairro.latitude> -23.60);
    assert.ok(bairro.longitude< -47.41 && bairro.longitude> -47.51);
    assert.match(bairro.fonteCep,/^https:\/\/cepbrasil.com\/sp\/votorantim\//);
    assert.match(bairro.fonteMapa,/^https:\/\/mapcarta.com\//);
  }
  const pontos=Array.from({length:80},(_,i)=>coordenadaDemo(i));
  assert.equal(new Set(pontos.map(([lat,lon])=>lat.toFixed(6)+","+lon.toFixed(6))).size,80);
  assert.equal(regiaoDemo(15),0);
});
test("a atualização do seed exige proteção e armazena fotos na API local", () => {
  const fonte=readFileSync(new URL("../../../frontend/scripts/enriquecer-demo.mjs",import.meta.url),"utf8");
  assert.match(fonte,/RESGATE_DEMO:"1"/);
  assert.match(fonte,/DB_NAME:"resgate_animais_demo"/);
  assert.match(fonte,/foto[s]?_ocorrencias/);
  assert.match(fonte,/randomUUID/);
  assert.match(fonte,/storage|uploads/);
});
