// Teste HTTP com MySQL descartável. Executar somente no runner isolado da CI.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

if(process.env.INTEGRACAO_TESTE!=="1" || process.env.NODE_ENV==="production"){
  throw new Error("Este roteiro exige INTEGRACAO_TESTE=1 e banco isolado de CI.");
}
const raiz=resolve(dirname(fileURLToPath(import.meta.url)),"../..");
const base=process.env.TEST_BASE_URL||"http://127.0.0.1:3000";
const senha="SenhaCI-SomenteRunner2026!";
const origem=new URL(base).origin;

async function chamar(caminho,{method="GET",cookie,body,origin=origem}={}){
  const headers={};
  if(cookie)headers.cookie=cookie;
  if(method!=="GET"){
    headers.origin=origin;
    if(body!==undefined)headers["content-type"]="application/json";
  }
  const resposta=await fetch(base+caminho,{
    method,headers,body:body===undefined?undefined:JSON.stringify(body),
    redirect:"manual",signal:AbortSignal.timeout(18000),
  });
  const texto=await resposta.text();
  let dados;
  try{dados=JSON.parse(texto);}catch{dados=texto;}
  return {status:resposta.status,headers:resposta.headers,dados};
}
function exigirStatus(resultado,esperado,descricao){
  assert.equal(resultado.status,esperado,descricao+": "+JSON.stringify(resultado.dados).slice(0,300));
  return resultado;
}
function cookieDe(resposta,nome){
  // Uma resposta pode ter cookies de limpeza e de criação de sessão.
  // get("set-cookie") concatena os cabeçalhos; pegar só o primeiro invalida o teste.
  const cookies=resposta.headers.getSetCookie();
  const valor=cookies.find(linha=>linha.startsWith(nome+"="));
  assert.ok(valor,"Cookie "+nome+" ausente: "+JSON.stringify(cookies.map(linha=>linha.split("=")[0])));
  return valor.split(";")[0];
}
async function cadastrar(nome,email,telefone){
  const r=exigirStatus(await chamar("/api/auth/cadastro",{
    method:"POST",body:{nome,email,telefone,senha}
  }),201,"Cadastro "+email);
  return cookieDe(r,"resgate_sessao");
}
function fixture(){
  const arquivo=readFileSync(new URL("../../backend/database/tests/fixture-http.sql",import.meta.url),"utf8");
  const processo=spawnSync("docker",["compose","exec","-T","mysql","sh","-c",
    'MYSQL_PWD="$MYSQL_PASSWORD" exec mysql --protocol=tcp -h 127.0.0.1 -u "$MYSQL_USER" "$MYSQL_DATABASE"'
  ],{cwd:raiz,input:arquivo,encoding:"utf8",timeout:30000});
  if(processo.status!==0)throw new Error("Fixture MySQL falhou: "+(processo.stderr||processo.error||"sem detalhe"));
}

async function executar(){
  const visitante=exigirStatus(await chamar("/api/ocorrencias"),200,"Mapa público acessível");
  assert.deepEqual(visitante.dados.ocorrencias,[],"Banco isolado deve começar sem ocorrências");
  exigirStatus(await chamar("/api/admin/ocorrencias"),403,"Visitante não é administrador");
  exigirStatus(await chamar("/api/conversas",{method:"POST",body:{ocorrencia:1}}),401,"Visitante não abre chat");
  const autor=await cadastrar("Autor Teste CI","ci-autor@example.invalid","15988887777");
  const interessado=await cadastrar("Interessado Teste CI","ci-interessado@example.invalid","15977776666");
  const terceiro=await cadastrar("Terceiro Teste CI","ci-terceiro@example.invalid","15966665555");
  exigirStatus(await chamar("/api/admin/ocorrencias",{cookie:autor}),403,"Cookie cidadão não habilita administração");
  const adm=exigirStatus(await chamar("/api/auth/login",{
    method:"POST",body:{email:"ci-admin@example.invalid",senha,admin:true}
  }),200,"Login administrativo");
  const administrador=cookieDe(adm,"resgate_admin_sessao");
  const meuAdm=exigirStatus(await chamar("/api/auth/admin/me",{cookie:administrador}),200,"Sessão administrativa");
  assert.ok(meuAdm.dados.usuario?.adminResgate,"Permissão ADMIN/RESGATE ausente");
  const admComCookieComum=await chamar("/api/auth/admin/me",{cookie:autor});
  assert.equal(admComCookieComum.dados.usuario,null,"Sessão cidadã não vira administrativa");
  exigirStatus(await chamar("/api/auth/login",{
    method:"POST",body:{email:"ci-autor@example.invalid",senha,admin:true}
  }),401,"Cidadão sem permissão não entra no painel");

  fixture();
  const pendentes=exigirStatus(await chamar("/api/admin/ocorrencias?status=PENDENTE",{cookie:administrador}),200,"Fila do administrador");
  const o=pendentes.dados.ocorrencias.find(item=>item.nome==="Animal CI isolado");
  assert.ok(o?.id,"Fixture pendente não encontrada");
  const id=Number(o.id);
  exigirStatus(await chamar("/api/ocorrencias/"+id),404,"Registro pendente não é público");
  exigirStatus(await chamar("/api/ocorrencias/"+id,{
    method:"PATCH",cookie:terceiro,body:{acao:"ENCERRAR",motivo:"OUTRO",detalhe:"Tentativa indevida"}
  }),404,"Terceiro não pode encerrar ocorrência");
  exigirStatus(await chamar("/api/admin/usuarios",{
    method:"PATCH",cookie:administrador,body:{
      id:Number(meuAdm.dados.usuario.id),acao:"SUSPENDER",confirmacao:"ci-admin@example.invalid"
    }
  }),400,"ADMIN Resgate não suspende conta global");
  exigirStatus(await chamar("/api/admin/ocorrencias",{
    method:"PATCH",cookie:administrador,body:{id,acao:"APROVAR"}
  }),200,"Aprovação administrativa");
  const publicas=exigirStatus(await chamar("/api/ocorrencias"),200,"Consulta pública");
  assert.ok(publicas.dados.ocorrencias.some(v=>Number(v.id)===id),"Animal aprovado não apareceu no mapa");
  exigirStatus(await chamar("/api/ocorrencias/"+id),200,"Cartaz aprovado");

  const conversa=exigirStatus(await chamar("/api/conversas",{
    method:"POST",cookie:interessado,body:{ocorrencia:id}
  }),200,"Interessado inicia chat");
  const idChat=Number(conversa.dados.id);
  assert.ok(idChat>0,"ID de conversa inválido");
  exigirStatus(await chamar("/api/conversas/"+idChat+"/mensagens",{cookie:terceiro}),404,"Terceiro não lê chat");
  exigirStatus(await chamar("/api/conversas/"+idChat+"/mensagens",{
    method:"POST",cookie:interessado,body:{conteudo:"Mensagem CI para o autor"}
  }),201,"Mensagem enviada");
  const avisos=exigirStatus(await chamar("/api/notificacoes",{cookie:autor}),200,"Notificações do destinatário");
  assert.ok(Number(avisos.dados.mensagensNaoLidas)>=1,"Mensagem não lida não registrada");
  const mensagens=exigirStatus(await chamar("/api/conversas/"+idChat+"/mensagens",{cookie:autor}),200,"Autor lê chat");
  const recebida=mensagens.dados.mensagens.find(m=>m.conteudo==="Mensagem CI para o autor");
  assert.ok(recebida,"Mensagem não encontrada");
  exigirStatus(await chamar("/api/conversas/"+idChat+"/mensagens",{
    method:"PATCH",cookie:autor,body:{ateId:Number(recebida.id)}
  }),200,"Confirmar leitura");
  const lidas=exigirStatus(await chamar("/api/notificacoes",{cookie:autor}),200,"Contador após leitura");
  assert.equal(Number(lidas.dados.mensagensNaoLidas),0,"Leitura não zerou o contador");
  exigirStatus(await chamar("/api/auth/logout",{method:"POST",cookie:autor}),200,"Logout de cidadão");
  const encerrada=exigirStatus(await chamar("/api/auth/me",{cookie:autor}),200,"Conferir sessão revogada");
  assert.equal(encerrada.dados.usuario,null,"Token revogado permaneceu válido");
  exigirStatus(await chamar("/api/admin/ocorrencias",{cookie:administrador}),200,"Sessão ADM segue independente");
  exigirStatus(await chamar("/api/admin/ocorrencias",{
    method:"PATCH",cookie:administrador,origin:"https://origem-invalida.example",
    body:{id,acao:"OCULTAR",motivo:"Teste da origem"}
  }),403,"CSRF por origem rejeitado");
  console.log("OK: cadastro, sessões independentes, moderação, mapa, CRUD protegido, chat, leitura, notificações e logout.");
}
for(let tentativa=0;tentativa<60;tentativa++){
  try{
    const r=await fetch(base+"/api/ocorrencias",{signal:AbortSignal.timeout(3000)});
    if(r.ok)break;
  }catch{}
  if(tentativa===59)throw new Error("Aplicação não ficou disponível para o teste HTTP.");
  await new Promise(resolve=>setTimeout(resolve,2000));
}
await executar();
