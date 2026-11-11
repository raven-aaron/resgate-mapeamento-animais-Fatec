import { spawn } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const raiz=fileURLToPath(new URL('../../../', import.meta.url));
const data=new Date().toISOString().replace(/[.:]/g,'-');
const destino=join(raiz,'backups','resgate-'+data);
if(process.argv.length>2){
  console.error('Uso: node backend/database/scripts/backup-local.mjs');
  process.exit(1);
}
function executar(args,saida){
  return new Promise((resolve,reject)=>{
    const processo=spawn('docker',['compose',...args],{cwd:raiz,stdio:['ignore','pipe','pipe'],windowsHide:true});
    let erro='';
    processo.stderr.on('data',b=>{erro+=b.toString().slice(0,3000);});
    processo.on('error',reject);
    if(saida){
      const arquivo=createWriteStream(saida,{flags:'wx',mode:0o600});
      processo.stdout.pipe(arquivo);
      arquivo.on('error',reject);
    }else{
      processo.stdout.on('data',()=>{});
    }
    processo.on('close',codigo=>{
      if(codigo===0)resolve(undefined);
      else reject(new Error((erro.trim()||'O Docker não concluiu a operação.')+' (código '+codigo+')'));
    });
  });
}
try{
  await mkdir(destino,{recursive:true,mode:0o700});
  const sql=join(destino,'resgate_animais.sql');
  // As credenciais são expandidas dentro do contêiner, nunca enviadas nos argumentos do host.
  await executar(['exec','-T','mysql','sh','-c',
    'MYSQL_PWD="$MYSQL_ROOT_PASSWORD" exec mysqldump --protocol=tcp -h 127.0.0.1 -u root --single-transaction --routines --triggers --events --set-gtid-purged=OFF "$MYSQL_DATABASE"'
  ],sql);
  // Copia também o volume de imagens; os arquivos não estão incluídos no SQL.
  await executar(['cp','web:/app/storage',join(destino,'storage')]);
  await writeFile(join(destino,'LEIA-ME.txt'),
    'Backup LOCAL de desenvolvimento. O SQL e as fotografias contêm dados pessoais.\n'+
    'Proteja os arquivos, mantenha-os fora do Git e não compartilhe publicamente.\n'+
    'Use as instruções de backend/docs/operacao/backup.md antes de restaurar.\n',
    {mode:0o600});
  console.log('Backup local concluído em: '+destino);
  console.log('Inclui MySQL e storage de fotografias. Não é sincronizado com o GitHub.');
}catch(erro){
  console.error('Backup não concluído: '+erro.message);
  console.error('Os arquivos parciais foram descartados; o banco e os volumes permanecem inalterados.');
  await rm(destino,{recursive:true,force:true}).catch(()=>undefined);
  process.exitCode=1;
}
