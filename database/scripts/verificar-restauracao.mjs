// Verificação segura de restauração: importa uma cópia do dump em MySQL descartável,
// sem acessar/alterar os volumes em uso pela equipe.
import { createReadStream } from "node:fs";
import { readdir, realpath, stat } from "node:fs/promises";
import { resolve, relative, join, sep } from "node:path";
import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";

const raiz=fileURLToPath(new URL("../../",import.meta.url));
const pastaBackups=resolve(raiz,"backups");
if(process.argv.length!==3){
  console.error("Uso: node database/scripts/verificar-restauracao.mjs backups/resgate-DATA");
  process.exit(1);
}
const pasta=await realpath(resolve(process.argv[2]));
const relativa=relative(pastaBackups,pasta);
if(!relativa || relativa.startsWith(".."+sep) || relativa===".." || relativa.startsWith(sep)){
  throw new Error("A verificação só aceita um backup de dentro da pasta backups/.");
}
const dump=join(pasta,"resgate_animais.sql");
if(!(await stat(dump)).isFile() || (await stat(dump)).size<100)
  throw new Error("Dump SQL não encontrado ou vazio.");
const nome="resgate-restauracao-"+randomBytes(5).toString("hex");
const senha=randomBytes(24).toString("hex");
const ambiente={...process.env,MYSQL_ROOT_PASSWORD:senha,MYSQL_PWD:senha};
function executar(args,{stdin,ignorarErro=false}={}){
  return new Promise((resolveExec,reject)=>{
    const processo=spawn("docker",args,{cwd:raiz,env:ambiente,stdio:["pipe","pipe","pipe"]});
    let saida="",erro="";
    processo.stdout.on("data",b=>{saida+=b.toString().slice(0,15000);});
    processo.stderr.on("data",b=>{erro+=b.toString().slice(0,2500);});
    processo.on("error",reject);
    if(stdin){
      const leitura=createReadStream(stdin);
      leitura.on("error",reject);
      leitura.pipe(processo.stdin);
    }else processo.stdin.end();
    processo.on("close",codigo=>{
      if(codigo===0||ignorarErro)resolveExec({codigo,saida,erro});
      else reject(new Error("Docker falhou ("+codigo+"): "+erro.slice(0,800)));
    });
  });
}
const aguardar=ms=>new Promise(resolveAguarda=>setTimeout(resolveAguarda,ms));
let iniciou=false;
try{
  await executar(["run","-d","--rm","--name",nome,"-e","MYSQL_ROOT_PASSWORD",
    "-e","MYSQL_DATABASE=resgate_animais","mysql:8.4.13"]);
  iniciou=true;
  let pronto=false;
  for(let i=0;i<90;i++){
    const ping=await executar(["exec","-e","MYSQL_PWD",nome,"mysqladmin","--protocol=tcp","-h","127.0.0.1","-uroot","ping","--silent"],{ignorarErro:true});
    if(ping.codigo===0){pronto=true;break;}
    await aguardar(1000);
  }
  if(!pronto)throw new Error("MySQL temporário não iniciou.");
  await executar(["exec","-i","-e","MYSQL_PWD",nome,"mysql","--protocol=tcp","-h","127.0.0.1",
    "-uroot","resgate_animais"],{stdin:dump});
  const resultado=await executar(["exec","-e","MYSQL_PWD",nome,"mysql","--protocol=tcp",
    "-h","127.0.0.1","-uroot","-N","-s","resgate_animais","-e",
    "SELECT (SELECT COUNT(*) FROM controle_migracoes WHERE situacao='APLICADA'),"+
    "(SELECT COUNT(*) FROM usuarios),"+
    "(SELECT COUNT(*) FROM ocorrencias),"+
    "(SELECT COUNT(*) FROM fotos_ocorrencias);"
  ]);
  const valores=resultado.saida.trim().split(/\s+/).map(Number);
  if(valores.length!==4||valores.some(v=>!Number.isInteger(v)||v<0)||valores[0]<4)
    throw new Error("Restauração incompleta: faltam migrações ou tabelas.");
  const pastas=await readdir(join(pasta,"storage")).catch(()=>[]);
  if(!pastas.length)console.log("Aviso: backup sem fotografias (pasta storage vazia).");
  console.log("RESTAURAÇÃO OK (cópia isolada). Migrações: "+valores[0]+
    "; contas: "+valores[1]+"; ocorrências: "+valores[2]+"; fotos SQL: "+valores[3]+".");
  console.log("O MySQL e os volumes originais não foram alterados.");
} finally{
  if(iniciou)await executar(["rm","-f",nome],{ignorarErro:true}).catch(()=>{});
}
