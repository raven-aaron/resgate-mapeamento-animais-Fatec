/**
 * Enriquece somente ocorrências GERADAS PELO SEED no banco de demonstração.
 * Mantém usuários, mensagens, moderação e fotos já cadastradas.
 * Uso no container web: RESGATE_DEMO=1 node scripts/enriquecer-demo.mjs --apply
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import mysql from "mysql2/promise";
import { BAIRROS_DEMO, regiaoDemo, coordenadaDemo } from "./demo-localidades.mjs";

const catalogo = {
  Cachorro:[710927,5331916,18056482,14757125,18436664,8725860,16620588,18039300],
  Gato:[20040107,32240328,12166274,4393613,20160713,34329307,40627687,19085198],
};
const pasta = join(process.cwd(),"storage");
const pastaFotos = join(pasta,"uploads");
const pastaCache = join(pasta,"demo-seed-cache");
const offline = process.env.CI === "true" && process.env.DEMO_MEDIA_OFFLINE === "1";

function jpegValido(bytes) {
  return bytes.length>5000 && bytes.length<3*1024*1024 &&
    bytes[0]===255 && bytes[1]===216 && bytes[2]===255 &&
    bytes.at(-2)===255 && bytes.at(-1)===217;
}
function verificarAmbiente(){
  const necessario = {
    RESGATE_DEMO:"1",DB_HOST:"mysql",DB_NAME:"resgate_animais_demo",
    DB_USER:"resgate_demo",APP_PUBLIC_URL:"http://localhost:3001",
  };
  for (const [nome,valor] of Object.entries(necessario)){
    if(process.env[nome]!==valor)throw new Error("Ambiente não autorizado: "+nome+" deve ser "+valor);
  }
  if(process.env.NODE_ENV==="production")throw new Error("Nunca executar em produção.");
}
async function carregarFotos(){
  await mkdir(pastaCache,{recursive:true});
  const resultado={Cachorro:[],Gato:[]};
  for(const [especie,ids] of Object.entries(catalogo)){
    for(const id of ids){
      const destino=join(pastaCache,"pexels-"+id+".jpg");
      try{
        let conteudo;
        if(offline){
          conteudo=await readFile(join(process.cwd(),"public","assets","cachorrogato2.jpg"));
        }else{
          try{
            const salvo=await readFile(destino);
            if(jpegValido(salvo))conteudo=salvo;
          }catch{}
          if(!conteudo){
            const url="https://images.pexels.com/photos/"+id+"/pexels-photo-"+id+
              ".jpeg?auto=compress&cs=tinysrgb&w=640";
            const resposta=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{Accept:"image/jpeg"}});
            if(!resposta.ok)throw new Error("HTTP "+resposta.status);
            const tamanho=Number(resposta.headers.get("content-length")||0);
            if(tamanho>3*1024*1024)throw new Error("Foto excede 3 MB");
            conteudo=Buffer.from(await resposta.arrayBuffer());
          }
        }
        if(!jpegValido(conteudo))throw new Error("JPEG inválido");
        if(!offline)await writeFile(destino,conteudo,{flag:"w"});
        resultado[especie].push({id,conteudo});
      }catch(error){
        console.warn("Fonte de foto "+id+" indisponível: "+error.message);
      }
    }
  }
  for(const [especie,colecao] of Object.entries(resultado)){
    if(colecao.length<1)throw new Error("Nenhuma foto de "+especie+" disponível. Confira Internet e tente novamente; nenhum registro foi alterado.");
  }
  return resultado;
}

async function executar(){
  const argumentos=process.argv.slice(2);
  if(argumentos.length!==1||!["--apply","--dry-run"].includes(argumentos[0])){
    throw new Error("Uso: RESGATE_DEMO=1 node scripts/enriquecer-demo.mjs --dry-run|--apply");
  }
  verificarAmbiente();
  const db=await mysql.createConnection({
    host:process.env.DB_HOST,port:Number(process.env.DB_PORT||3306),
    user:process.env.DB_USER,password:process.env.DB_PASSWORD,database:process.env.DB_NAME,
  });
  const criados=[];
  let emTransacao=false;
  try{
    const [[estado]]=await db.query(
      "SELECT DATABASE() AS nome, "+
      "(SELECT COUNT(*) FROM controle_migracoes WHERE situacao='APLICADA') AS migracoes, "+
      "(SELECT COUNT(*) FROM usuarios WHERE email='demo.admin@seed.resgate.invalid') AS admin"
    );
    if(estado.nome!=="resgate_animais_demo"||estado.migracoes<4||estado.admin!==1)
      throw new Error("Base DEMO não inicializada pelo seed. Nada foi modificado.");
    const [ocorrencias]=await db.query(
      "SELECT o.id_ocorrencia AS id, e.nome AS especie, b.nome AS bairro,"+
      "(SELECT COUNT(*) FROM fotos_ocorrencias f WHERE f.id_ocorrencia=o.id_ocorrencia) AS qtdFotos "+
      "FROM ocorrencias o JOIN usuarios u ON u.id_usuario=o.id_usuario_criador "+
      "JOIN bairros b ON b.id_bairro=o.id_bairro "+
      "JOIN animais a ON a.id_animal=o.id_animal JOIN especies e ON e.id_especie=a.id_especie "+
      "WHERE u.email REGEXP '^demo[.]usuario[0-9]{2,3}@seed[.]resgate[.]invalid
    );
    if(!ocorrencias.length)throw new Error("Não encontrei ocorrências geradas pelo seed. Banco preservado.");
    const semFotos=ocorrencias.filter(o=>Number(o.qtdFotos)===0);
    console.log("DEMO: "+ocorrencias.length+" ocorrências sintéticas, "+
      semFotos.length+" sem foto. "+BAIRROS_DEMO.length+" bairros reais de referência.");
    if(argumentos[0]==="--dry-run"){
      console.log("Prévia apenas; nenhum registro ou arquivo foi alterado.");
      return;
    }
    const biblioteca=semFotos.length ? await carregarFotos() : null;
    await mkdir(pastaFotos,{recursive:true});
    // Fotos são gravadas antes do COMMIT, e removidas se a transação falhar.
    await db.beginTransaction();
    emTransacao=true;
    const bairros=[];
    for(const {nome,latitude,longitude} of BAIRROS_DEMO){
      const [resultado]=await db.execute(
        "INSERT INTO bairros (nome,latitude_aproximada,longitude_aproximada) VALUES (?,?,?) "+
        "ON DUPLICATE KEY UPDATE id_bairro=LAST_INSERT_ID(id_bairro)",
        [nome,latitude,longitude]
      );
      bairros.push(resultado.insertId);
    }
    let adicionadas=0;
    for(let i=0;i<ocorrencias.length;i++){
      const o=ocorrencias[i];
      const setor=regiaoDemo(i);
      const [latitude,longitude]=coordenadaDemo(i);
      await db.execute(
        "UPDATE ocorrencias SET id_bairro=?,cep=?,latitude_aproximada=?,longitude_aproximada=?,"+
        "ponto_referencia=NULL,logradouro=NULL,origem_localizacao='BAIRRO',precisao_localizacao='BAIRRO_APROXIMADO' "+
        "WHERE id_ocorrencia=?",
        [bairros[setor],BAIRROS_DEMO[setor].cep,latitude,longitude,o.id]
      );
      if(Number(o.qtdFotos)!==0)continue;
      const bancoFotos=biblioteca[o.especie];
      if(!bancoFotos?.length)throw new Error("Espécie sem foto ilustrativa: "+o.especie);
      const fonte=bancoFotos[(i+Math.floor(i/3))%bancoFotos.length];
      const arquivo=randomUUID()+".jpg";
      const caminho=join(pastaFotos,arquivo);
      // Nomes UUID e diretório protegido; nenhum arquivo preexistente é sobrescrito.
      await writeFile(caminho,fonte.conteudo,{flag:"wx"});
      criados.push(caminho);
      await db.execute(
        "INSERT INTO fotos_ocorrencias (id_ocorrencia,provedor,identificador_arquivo,url_foto,ordem) "+
        "VALUES (?,'LOCAL',?,?,1)",
        [o.id,arquivo,"/api/fotos/"+arquivo]
      );
      adicionadas++;
    }
    await db.commit();
    emTransacao=false;
    console.log("DEMO ENRIQUECIDO OK | ocorrências redistribuídas="+ocorrencias.length+
      " | fotos adicionadas="+adicionadas+" | bairros reais="+BAIRROS_DEMO.length);
    console.log("Dados de cidadãos e registros não sintéticos permanecem intactos.");
  }catch(error){
    if(emTransacao)await db.rollback().catch(()=>undefined);
    await Promise.all(criados.map(arquivo=>unlink(arquivo).catch(()=>undefined)));
    throw error;
  }finally{await db.end();}
}
executar().catch(error=>{console.error("Enriquecimento interrompido:",error.message);process.exitCode=1;});
 "+
      "AND o.descricao LIKE '%Registro sintético DEMO, sem tutor ou endereço real.%' "+
      "ORDER BY o.id_ocorrencia"
    );
    if(!ocorrencias.length)throw new Error("Não encontrei ocorrências geradas pelo seed. Banco preservado.");
    const semFotos=ocorrencias.filter(o=>Number(o.qtdFotos)===0);
    console.log("DEMO: "+ocorrencias.length+" ocorrências sintéticas, "+
      semFotos.length+" sem foto. "+PONTOS_DEMO.length+" setores espaciais.");
    if(argumentos[0]==="--dry-run"){
      console.log("Prévia apenas; nenhum registro ou arquivo foi alterado.");
      return;
    }
    const biblioteca=semFotos.length ? await carregarFotos() : null;
    await mkdir(pastaFotos,{recursive:true});
    // Fotos são gravadas antes do COMMIT, e removidas se a transação falhar.
    await db.beginTransaction();
    emTransacao=true;
    const bairros=[];
    for(let i=0;i<PONTOS_DEMO.length;i++){
      const nome="Região Demo "+String(i+1).padStart(2,"0");
      const [lat,lon]=PONTOS_DEMO[i];
      const [resultado]=await db.execute(
        "INSERT INTO bairros (nome,latitude_aproximada,longitude_aproximada) VALUES (?,?,?) "+
        "ON DUPLICATE KEY UPDATE id_bairro=LAST_INSERT_ID(id_bairro),"+
        "latitude_aproximada=VALUES(latitude_aproximada),longitude_aproximada=VALUES(longitude_aproximada)",
        [nome,lat,lon]
      );
      bairros.push(resultado.insertId);
    }
    let adicionadas=0;
    for(let i=0;i<ocorrencias.length;i++){
      const o=ocorrencias[i];
      const setor=regiaoDemo(i);
      const [latitude,longitude]=coordenadaDemo(i);
      await db.execute(
        "UPDATE ocorrencias SET id_bairro=?,latitude_aproximada=?,longitude_aproximada=?,"+
        "ponto_referencia=?,origem_localizacao='BAIRRO',precisao_localizacao='BAIRRO_APROXIMADO' "+
        "WHERE id_ocorrencia=?",
        [bairros[setor],latitude,longitude,
          "Setor fictício "+String(setor+1).padStart(2,"0")+", localização ilustrativa",o.id]
      );
      if(Number(o.qtdFotos)!==0)continue;
      const bancoFotos=biblioteca[o.especie];
      if(!bancoFotos?.length)throw new Error("Espécie sem foto ilustrativa: "+o.especie);
      const fonte=bancoFotos[(i+Math.floor(i/3))%bancoFotos.length];
      const arquivo=randomUUID()+".jpg";
      const caminho=join(pastaFotos,arquivo);
      // Nomes UUID e diretório protegido; nenhum arquivo preexistente é sobrescrito.
      await writeFile(caminho,fonte.conteudo,{flag:"wx"});
      criados.push(caminho);
      await db.execute(
        "INSERT INTO fotos_ocorrencias (id_ocorrencia,provedor,identificador_arquivo,url_foto,ordem) "+
        "VALUES (?,'LOCAL',?,?,1)",
        [o.id,arquivo,"/api/fotos/"+arquivo]
      );
      adicionadas++;
    }
    await db.commit();
    emTransacao=false;
    console.log("DEMO ENRIQUECIDO OK | ocorrências redistribuídas="+ocorrencias.length+
      " | fotos adicionadas="+adicionadas+" | setores="+PONTOS_DEMO.length);
    console.log("Dados de cidadãos e registros não sintéticos permanecem intactos.");
  }catch(error){
    if(emTransacao)await db.rollback().catch(()=>undefined);
    await Promise.all(criados.map(arquivo=>unlink(arquivo).catch(()=>undefined)));
    throw error;
  }finally{await db.end();}
}
executar().catch(error=>{console.error("Enriquecimento interrompido:",error.message);process.exitCode=1;});
