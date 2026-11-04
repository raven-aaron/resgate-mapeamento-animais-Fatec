/**
 * Popula APENAS a base resgate_animais_demo, criada no projeto Docker separado.
 * Sem --apply, imprime somente o plano e não acessa o banco.
 * Não faz limpeza, DELETE, DROP, TRUNCATE nem altera a base da equipe.
 */
import { randomBytes, scryptSync } from "node:crypto";
import { readFileSync } from "node:fs";
import { consultar } from "./mysql.mjs";

const ajuda = [
  "Uso: RESGATE_DEMO=1 node database/scripts/seed-demo.mjs [--dry-run | --apply] [--count N] [--users N] [--chats N] [--seed N]",
  "Padrão: --dry-run --count 80 --users 24 --chats 35 --seed 2026.",
  "Os dados são criados APENAS no projeto Docker resgate-animais-demo e nunca alteram o banco principal.",
].join("\n");

function argumentosDaCli(entrada) {
  const opcoes = { apply: false, count: 80, users: 24, chats: 35, seed: 2026 };
  const limites = { count: [10,250], users: [4,80], chats: [0,400], seed: [1,2147483647] };
  for (let i = 0; i < entrada.length; i++) {
    const arg = entrada[i];
    if (arg === "--help") return null;
    if (arg === "--dry-run") { opcoes.apply = false; continue; }
    if (arg === "--apply") { opcoes.apply = true; continue; }
    const nome = { "--count": "count", "--users": "users", "--chats": "chats", "--seed": "seed" }[arg];
    if (!nome || i+1 >= entrada.length || !/^[0-9]+$/.test(entrada[i+1])) throw new Error("Argumento inválido: "+arg+"\n"+ajuda);
    const valor = Number(entrada[++i]);
    if (!Number.isSafeInteger(valor) || valor < limites[nome][0] || valor > limites[nome][1]) {
      throw new Error(nome+" fora do intervalo "+limites[nome].join(" a ")+".");
    }
    opcoes[nome] = valor;
  }
  return opcoes;
}

const primeiros = ["Marina","Paula","Beatriz","Renata","Daniel","Lucas","André","Gabriel","Ana","João",
  "Camila","Rafael","Larissa","Mateus","Isabela","Bruno","Clara","Pedro","Júlia","Felipe"];
const sobrenomes = ["Oliveira","Costa","Lima","Mendes","Souza","Pereira","Almeida","Barros","Rocha","Ferreira"];
const nomesPet = ["Mel","Luna","Thor","Nina","Bidu","Amora","Duke","Pipoca","Bolinha","Tobias",
  "Frida","Zeus","Maya","Theo","Cacau","Pingo","Sol","Bento","Lola","Max","Belinha","Kira"];
const descricoes = [
  "Animal de porte tranquilo, pelagem curta e comportamento dócil.",
  "Visto nas proximidades de uma praça. Sem informações sobre o tutor.",
  "Pelagem marcada, costuma responder a chamados e aproxima-se com facilidade.",
  "Animal assustado; foi observado caminhando pela região.",
  "Possui sinais particulares na pelagem e aparenta estar bem cuidado.",
  "Último avistamento em via pública, próximo a um comércio da região.",
];
const mensagensExemplo = [
  "Olá, vi o registro e gostaria de saber mais.",
  "Você poderia confirmar as características do animal?",
  "Obrigado pelo contato. Posso passar mais detalhes por aqui.",
  "A pelagem parece semelhante à do animal que estou procurando.",
  "Posso compartilhar uma descrição adicional para comparação.",
  "Certo, vou verificar e retorno nesta conversa.",
];

function gerador(seed) {
  let estado = seed >>> 0;
  return () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = Math.imul(estado ^ (estado >>> 15), 1 | estado);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function inteiro(rng,min,max) { return min + Math.floor(rng() * (max - min + 1)); }
function escolher(rng,lista) { return lista[inteiro(rng,0,lista.length-1)]; }
function valorSql(valor) {
  if (valor === null || valor === undefined) return "NULL";
  if (typeof valor === "number") {
    if (!Number.isFinite(valor)) throw new Error("Número inválido.");
    return String(valor);
  }
  return "'" + String(valor).replaceAll("\\","\\\\").replaceAll("'","''") + "'";
}
function registro(sql,tabela,colunas,valores) {
  sql.push("INSERT INTO "+tabela+" ("+colunas.join(",")+") VALUES ("+valores.map(valorSql).join(",")+");");
}
function validarAmbiente() {
  if (process.env.NODE_ENV === "production" || process.env.RESGATE_DEMO !== "1") {
    throw new Error("Defina RESGATE_DEMO=1. O seed nunca executa no projeto principal ou em produção.");
  }
  const linhas = readFileSync(new URL("../../.env.demo",import.meta.url),"utf8").split(/\r?\n/);
  const cfg = {};
  for (const linha of linhas) {
    const m = linha.match(/^([A-Z_]+)=(.*)$/);
    if (m) cfg[m[1]] = m[2].trim();
  }
  const regras = {
    MYSQL_DATABASE: "resgate_animais_demo",
    MYSQL_HOST_PORT: "3308",
    WEB_PORT: "3001",
    WEB_BIND_HOST: "127.0.0.1",
  };
  for (const [chave,esperado] of Object.entries(regras)) {
    if (cfg[chave] !== esperado) throw new Error(".env.demo: "+chave+" deve ser "+esperado+".");
  }
  for (const chave of ["MYSQL_ROOT_PASSWORD","MYSQL_PASSWORD"]) {
    if (!cfg[chave] || cfg[chave].length < 12)
      throw new Error("Configure "+chave+" com pelo menos 12 caracteres em .env.demo.");
  }
  if (cfg.MYSQL_ROOT_PASSWORD === cfg.MYSQL_PASSWORD)
    throw new Error("As senhas root e da aplicação demo devem ser diferentes.");
}
function verificarBancoVazio() {
  const dados = consultar(
    "SELECT DATABASE(), "+
    "(SELECT COUNT(*) FROM controle_migracoes WHERE situacao='APLICADA'), "+
    "(SELECT COUNT(*) FROM usuarios), "+
    "(SELECT COUNT(*) FROM ocorrencias), "+
    "(SELECT COUNT(*) FROM conversas);"
  ).split("\t");
  if (dados.length !== 5 || dados[0] !== "resgate_animais_demo" || Number(dados[1]) < 4)
    throw new Error("Banco de demonstração incorreto ou migrações ausentes.");
  if (dados.slice(2).some(v => Number(v) !== 0))
    throw new Error("O banco demo já contém usuários/ocorrências/conversas. Seed recusado para evitar misturar ou duplicar dados.");
}
function produzirSql(opcoes,senha) {
  const rnd = gerador(opcoes.seed);
  const sql = ["START TRANSACTION;"];
  const usuarios = [];
  for (let i = 0; i < opcoes.users; i++) {
    const nome = i === 0 ? "Administrador Demo" : escolher(rnd,primeiros)+" "+escolher(rnd,sobrenomes);
    const email = i === 0 ? "demo.admin@seed.resgate.invalid" :
      "demo.usuario"+String(i).padStart(2,"0")+"@seed.resgate.invalid";
    // Hash individual, sal aleatório; a senha não é versionada.
    const salt = randomBytes(16).toString("hex");
    const hash = "scrypt$"+salt+"$"+scryptSync(senha,salt,64).toString("hex");
    registro(sql,"usuarios",["nome","email","senha_hash"],[nome,email,hash]);
    sql.push("SET @demo_u"+i+" = LAST_INSERT_ID();");
    usuarios.push({i,email});
  }
  sql.push("INSERT INTO permissoes_usuarios (id_usuario,modulo,papel) VALUES (@demo_u0,'RESGATE','ADMIN');");

  for (let i = 0; i < 12; i++) {
    const nome = "Região Demo "+String(i+1).padStart(2,"0");
    const latitude = (-23.535 - (i%4)*0.005).toFixed(6);
    const longitude = (-47.433 - Math.floor(i/4)*0.007).toFixed(6);
    sql.push("INSERT INTO bairros (nome,latitude_aproximada,longitude_aproximada) VALUES ("+
      [nome,latitude,longitude].map(valorSql).join(",")+");");
    sql.push("SET @demo_b"+i+" = LAST_INSERT_ID();");
  }

  const abertas = [];
  const estados = { APROVADO:0, PENDENTE:0, REJEITADO:0, OCULTO:0, RESOLVIDO:0 };
  for (let i = 0; i < opcoes.count; i++) {
    const owner = 1 + (i%(opcoes.users-1));
    const especie = rnd()<0.75 ? "Cachorro" : "Gato";
    const tipo = i%2 === 0 ? "PERDIDO" : "ENCONTRADO";
    const nome = tipo==="ENCONTRADO" && rnd()<0.55 ? null : escolher(rnd,nomesPet);
    const cor = escolher(rnd,["Preta","Branca","Marrom","Caramelo","Cinza","Laranja"]);
    const situacao = i%10 <= 5 ? "APROVADO" : i%10===6 ? "PENDENTE" : i%10===7 ? "REJEITADO" : i%10===8 ? "OCULTO" : "RESOLVIDO";
    const aprovado = situacao==="APROVADO" || situacao==="RESOLVIDO";
    const encerrado = situacao==="RESOLVIDO";
    const bairro = i%12;
    const sexo = escolher(rnd,["MACHO","FEMEA","INDETERMINADO"]);
    const porte = escolher(rnd,["PEQUENO","MEDIO","GRANDE"]);
    const descricao = escolher(rnd,descricoes)+" Registro sintético DEMO, sem tutor ou endereço real.";
    const latitude = (-23.535 - (bairro%4)*0.005).toFixed(6);
    const longitude = (-47.433 - Math.floor(bairro/4)*0.007).toFixed(6);
    sql.push("INSERT INTO animais (nome,id_especie,sexo,porte,possui_microchip,idade_aproximada,caracteristicas) "+
      "SELECT "+valorSql(nome)+",id_especie,"+valorSql(sexo)+","+
      valorSql(porte)+","+(tipo==="PERDIDO" ? (rnd()<0.25?"1":"0") : "NULL")+","+
      valorSql(inteiro(rnd,1,10)+" anos")+","+valorSql(descricao)+
      " FROM especies WHERE nome="+valorSql(especie)+" LIMIT 1;");
    sql.push("SET @demo_a"+i+" = LAST_INSERT_ID();");
    sql.push("INSERT INTO animais_cores (id_animal,id_cor) "+
      "SELECT @demo_a"+i+",id_cor FROM cores WHERE nome="+valorSql(cor)+" LIMIT 1;");
    const status = situacao==="RESOLVIDO" ? "APROVADO" : situacao;
    const motivo = encerrado ? (tipo==="PERDIDO" ? "REENCONTRADO" : "DEVOLVIDO_AO_TUTOR") : null;
    sql.push("INSERT INTO ocorrencias (id_usuario_criador,id_animal,id_bairro,ponto_referencia,"+
      "tipo_ocorrencia,status_aprovacao,status_caso,motivo_encerramento,encerrado_em,data_evento,descricao,"+
      "latitude_aproximada,longitude_aproximada,origem_localizacao,precisao_localizacao) VALUES ("+
      ["@demo_u"+owner,"@demo_a"+i,"@demo_b"+bairro,valorSql("Região simulada "+String(bairro+1).padStart(2,"0")),
        valorSql(tipo),valorSql(status),valorSql(encerrado?"RESOLVIDO":"ABERTO"),valorSql(motivo),
        encerrado?"UTC_TIMESTAMP(3)":"NULL","DATE_SUB(CURDATE(), INTERVAL "+inteiro(rnd,1,75)+" DAY)",
        valorSql(descricao),valorSql(latitude),valorSql(longitude),"'BAIRRO'","'BAIRRO_APROXIMADO'"].join(",")+");");
    sql.push("SET @demo_o"+i+" = LAST_INSERT_ID();");
    sql.push("INSERT INTO historico_ocorrencias (id_ocorrencia,id_usuario_responsavel,acao) "+
      "VALUES (@demo_o"+i+",@demo_u"+owner+",'CRIACAO');");
    if (aprovado) {
      sql.push("INSERT INTO historico_ocorrencias (id_ocorrencia,id_usuario_responsavel,acao) "+
        "VALUES (@demo_o"+i+",@demo_u0,'APROVACAO');");
    } else if (situacao==="REJEITADO" || situacao==="OCULTO") {
      sql.push("INSERT INTO historico_ocorrencias (id_ocorrencia,id_usuario_responsavel,acao,motivo) "+
        "VALUES (@demo_o"+i+",@demo_u0,"+valorSql(situacao==="REJEITADO"?"REJEICAO":"OCULTACAO")+
        ",'Informações insuficientes para o registro sintético.');");
    }
    if (situacao==="RESOLVIDO") {
      sql.push("INSERT INTO historico_ocorrencias (id_ocorrencia,id_usuario_responsavel,acao,motivo) "+
        "VALUES (@demo_o"+i+",@demo_u"+owner+",'ENCERRAMENTO',"+valorSql(motivo)+");");
    }
    if(situacao!=="PENDENTE"){
      registro(sql,"notificacoes",["id_usuario","modulo","tipo","id_ocorrencia","texto"],[
        // Ao gerar SQL abaixo, substituímos referências de sessão por variáveis SQL.
        "__REF_USUARIO__","RESGATE",
        situacao==="REJEITADO"?"OCORRENCIA_REJEITADA":situacao==="OCULTO"?"OCORRENCIA_OCULTA":"OCORRENCIA_APROVADA",
        "__REF_OCORRENCIA__","Atualização de ocorrência sintética DEMO."
      ]);
      // A substituição das duas referências é limitada a esta última instrução.
      const ultima = sql.pop();
      sql.push(ultima.replace(valorSql("__REF_USUARIO__"),"@demo_u"+owner)
        .replace(valorSql("__REF_OCORRENCIA__"),"@demo_o"+i));
    }
    if (situacao==="APROVADO") abertas.push({i,owner});
    estados[situacao]++;
  }
  for(let i=0;i<opcoes.chats;i++){
    const ocorrencia = abertas[i%abertas.length];
    let interessado = 1 + inteiro(rnd,0,opcoes.users-2);
    if (interessado === ocorrencia.owner)
      interessado = 1 + (interessado%(opcoes.users-1));
    // Respeita o índice exclusivo (ocorrência, interessado): uma conversa por par.
    const chatSlot = Math.floor(i/abertas.length);
    interessado = 1 + ((interessado - 1 + chatSlot)%(opcoes.users-1));
    if (interessado === ocorrencia.owner)
      interessado = 1 + (interessado%(opcoes.users-1));
    sql.push("INSERT INTO conversas (id_ocorrencia,id_usuario_interessado) VALUES (@demo_o"+
      ocorrencia.i+",@demo_u"+interessado+");");
    sql.push("SET @demo_chat"+i+"=LAST_INSERT_ID();");
    const qtdMensagens = inteiro(rnd,2,5);
    for(let m=0;m<qtdMensagens;m++){
      const sender = m%2===0?interessado:ocorrencia.owner;
      const receptor = m%2===0?ocorrencia.owner:interessado;
      const lida = m<qtdMensagens-1 || rnd()<0.35;
      const msg = escolher(rnd,mensagensExemplo)+" [DEMO "+(i+1)+"]";
      sql.push("INSERT INTO mensagens (id_conversa,id_remetente,conteudo,lida_em) VALUES "+
        "(@demo_chat"+i+",@demo_u"+sender+","+valorSql(msg)+","+
        (lida?"UTC_TIMESTAMP(3)":"NULL")+");");
      if(!lida){
        sql.push("INSERT INTO notificacoes (id_usuario,modulo,tipo,id_ocorrencia,id_conversa,texto) VALUES "+
          "(@demo_u"+receptor+",'RESGATE','NOVA_MENSAGEM',@demo_o"+ocorrencia.i+
          ",@demo_chat"+i+",'Nova mensagem de demonstração.');");
      }
    }
  }
  sql.push("COMMIT;");
  return {sql:sql.join("\n")+"\n",estados,abertas:abertas.length};
}

try{
  const opcoes = argumentosDaCli(process.argv.slice(2));
  if(!opcoes){console.log(ajuda);process.exit(0);}
  if(opcoes.chats > Math.ceil(opcoes.count * 0.6) * (opcoes.users - 2)){
    throw new Error("Conversas demais para a quantidade de ocorrências e usuários.");
  }
  if(!opcoes.apply){
    const resumo = produzirSql(opcoes,"SenhaDryRunDescartavel2026!");
    console.log("Prévia (nenhuma escrita): "+JSON.stringify({
      projeto:"resgate-animais-demo", banco:"resgate_animais_demo", usuarios:opcoes.users,
      ocorrencias:opcoes.count,conversas:opcoes.chats,estados:resumo.estados,
      instrucoesSQL:resumo.sql.split("\n").length-1,seed:opcoes.seed
    },null,2));
    process.exit(0);
  }
  validarAmbiente();
  verificarBancoVazio();
  const senha = process.env.DEMO_SEED_PASSWORD || (randomBytes(18).toString("base64url")+"!");
  if(senha.length<12)throw new Error("DEMO_SEED_PASSWORD precisa ter pelo menos 12 caracteres.");
  const gerado = produzirSql(opcoes,senha);
  consultar(gerado.sql);
  const numeros = consultar("SELECT (SELECT COUNT(*) FROM usuarios),"+
    "(SELECT COUNT(*) FROM ocorrencias),(SELECT COUNT(*) FROM conversas),"+
    "(SELECT COUNT(*) FROM mensagens);").split("\t").map(Number);
  if(numeros[0]!==opcoes.users||numeros[1]!==opcoes.count||numeros[2]!==opcoes.chats){
    throw new Error("Os totais da base demo não correspondem à geração planejada: "+numeros.join(","));
  }
  console.log("SEED DEMO OK | usuários="+numeros[0]+" ocorrências="+numeros[1]+
    " conversas="+numeros[2]+" mensagens="+numeros[3]);
  console.log("Administrador: demo.admin@seed.resgate.invalid");
  console.log("Cidadão: demo.usuario01@seed.resgate.invalid");
  if(!process.env.CI)console.log("Senha gerada para todas as contas DEMO: "+senha);
  else console.log("Senha CI definida em DEMO_SEED_PASSWORD (não exibida).");
  console.log("Dados de demonstração isolados. Não são fotografias ou tutores reais.");
}catch(error){
  console.error("Seed interrompido: "+error.message);
  process.exitCode=1;
}
