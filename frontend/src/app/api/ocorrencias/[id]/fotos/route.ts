import { NextResponse } from "next/server";
import type { PoolConnection, ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { randomUUID } from "node:crypto";
import { banco } from "../../../../../lib/db";
import { usuarioAtual } from "../../../../../lib/auth";
import { mesmaOrigem } from "../../../../../lib/seguranca";
import { administradorAtual } from "../../../../../lib/auth";
import { salvarFoto, excluirFoto, ErroArmazenamento, type ProvedorFoto } from "../../../../../lib/storage-fotos";

export const runtime="nodejs";
type Contexto={params:Promise<{id:string}>};
type Arquivo={nome:string;bytes:Uint8Array};
const formatoId=/^[1-9]\d{0,9}$/;
const formatoFoto=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/;
function err(texto:string,status:number){return NextResponse.json({erro:texto},{status});}
function extensaoImagem(bytes:Uint8Array){
  if(bytes.length>=3 && bytes[0]===255 && bytes[1]===216 && bytes[2]===255)return "jpg";
  if(bytes.length>=8 && [137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v))return "png";
  if(bytes.length>=12 && String.fromCharCode(...bytes.slice(0,4))==="RIFF" &&
    String.fromCharCode(...bytes.slice(8,12))==="WEBP")return "webp";
  return null;
}
async function acesso(conn:PoolConnection,id:number,userId:number){
  const [rows]=await conn.execute<RowDataPacket[]>(
    "SELECT status_aprovacao,status_caso FROM ocorrencias "+
    "WHERE id_ocorrencia=? AND id_usuario_criador=? AND excluido_em IS NULL FOR UPDATE",
    [id,userId]
  );
  const o=rows[0];
  return o && o.status_caso==="ABERTO" && ["PENDENTE","REJEITADO","APROVADO"].includes(o.status_aprovacao)?o:null;
}
async function listar(conn:PoolConnection,id:number){
  const [rows]=await conn.execute<RowDataPacket[]>(
    "SELECT id_foto AS id,url_foto AS url FROM fotos_ocorrencias WHERE id_ocorrencia=? ORDER BY ordem",[id]
  );
  return rows.map(f=>({id:Number(f.id),url:String(f.url)}));
}
async function historico(conn:PoolConnection,id:number,userId:number,tipo:string,numero:number){
  await conn.execute("UPDATE ocorrencias SET status_aprovacao='PENDENTE' WHERE id_ocorrencia=?",[id]);
  await conn.execute(
    "INSERT INTO historico_ocorrencias (id_ocorrencia,id_usuario_responsavel,acao,motivo,dados_novos) "+
    "VALUES (?,?,'EDICAO',?,?)",
    [id,userId,tipo,JSON.stringify({fotos_alteradas:numero,status_aprovacao:"PENDENTE"})]
  );
  await conn.execute(
    "INSERT INTO auditoria (id_usuario_responsavel,modulo,acao,entidade,id_registro) "+
    "VALUES (?,'RESGATE','EDICAO_FOTOS','ocorrencias',?)",[userId,id]
  );
}
export async function POST(request:Request,contexto:Contexto){
  if(!mesmaOrigem(request))return err("Origem não permitida.",403);
  const usuario=(await usuarioAtual()) ?? (await administradorAtual());
  if(!usuario)return err("Entre na sua conta.",401);
  const {id:valor}=await contexto.params;
  if(!formatoId.test(valor))return err("Identificador inválido.",400);
  if(Number(request.headers.get("content-length")||0)>26*1024*1024)return err("Fotos excedem o limite.",413);
  let conn:PoolConnection|null=null;
  let concluiu=false;
  const criados:{nome:string;provedor:ProvedorFoto}[]=[];
  try{
    const form=await request.formData();
    const fotos=form.getAll("fotos").filter((v):v is File=>v instanceof File);
    if(fotos.length<1||fotos.length>5||fotos.some(f=>f.size===0||f.size>5*1024*1024))
      return err("Selecione de 1 a 5 fotos, cada uma com até 5 MB.",400);
    const arquivos:Arquivo[]=[];
    for(const foto of fotos){
      const bytes=new Uint8Array(await foto.arrayBuffer());
      const ext=extensaoImagem(bytes);
      if(!ext || !(foto.type==="image/jpeg"&&ext==="jpg" ||
        foto.type==="image/png"&&ext==="png" || foto.type==="image/webp"&&ext==="webp"))
        return err("Envie apenas fotos JPG, PNG ou WebP válidas.",400);
      arquivos.push({nome:randomUUID()+"."+ext,bytes});
    }
    conn=await banco().getConnection();
    await conn.beginTransaction();
    const id=Number(valor);
    const o=await acesso(conn,id,usuario.id);
    if(!o)return err("Ocorrência não encontrada ou não editável.",404);
    const [existentes]=await conn.execute<RowDataPacket[]>(
      "SELECT ordem FROM fotos_ocorrencias WHERE id_ocorrencia=? ORDER BY ordem FOR UPDATE",[id]
    );
    if(existentes.length+arquivos.length>5)return err("A ocorrência permite no máximo cinco fotos.",409);
    const usadas=new Set(existentes.map(x=>Number(x.ordem)));
    for(const arquivo of arquivos){
      const ordem=[1,2,3,4,5].find(x=>!usadas.has(x));
      if(!ordem)throw new Error("Limite de fotografias");
      usadas.add(ordem);
      const provedor=await salvarFoto(arquivo.nome,arquivo.bytes);
      criados.push({nome:arquivo.nome,provedor});
      await conn.execute<ResultSetHeader>(
        "INSERT INTO fotos_ocorrencias (id_ocorrencia,provedor,identificador_arquivo,url_foto,ordem) "+
        "VALUES (?,?,?,?,?)",
        [id,provedor,arquivo.nome,"/api/fotos/"+arquivo.nome,ordem]
      );
    }
    await historico(conn,id,usuario.id,"Adição de fotografias",arquivos.length);
    await conn.commit();
    concluiu=true;
    return NextResponse.json({ok:true,fotos:await listar(conn,id)});
  }catch(error){
    console.error("Falha ao adicionar fotografias",error);
    return error instanceof ErroArmazenamento ? err(error.message,503) : err("Não foi possível adicionar as fotos.",500);
  }finally{
    if(conn){
      if(!concluiu)await conn.rollback().catch(()=>undefined);
      conn.release();
    }
    if(!concluiu)await Promise.all(criados.map(foto =>
      excluirFoto(foto.nome,foto.provedor).catch(error => console.warn("Falha ao desfazer upload",error))
    ));
  }
}
export async function DELETE(request:Request,contexto:Contexto){
  if(!mesmaOrigem(request))return err("Origem não permitida.",403);
  const usuario=(await usuarioAtual()) ?? (await administradorAtual());
  if(!usuario)return err("Entre na sua conta.",401);
  const {id:valor}=await contexto.params;
  if(!formatoId.test(valor))return err("Identificador inválido.",400);
  let conn:PoolConnection|null=null;
  let concluiu=false;
  try{
    const dados=await request.json() as {idFoto?:number};
    const idFoto=Number(dados.idFoto);
    if(!Number.isSafeInteger(idFoto)||idFoto<1)return err("Fotografia inválida.",400);
    conn=await banco().getConnection();
    await conn.beginTransaction();
    const id=Number(valor);
    const o=await acesso(conn,id,usuario.id);
    if(!o)return err("Ocorrência não encontrada ou não editável.",404);
    const [rows]=await conn.execute<RowDataPacket[]>(
      "SELECT provedor,identificador_arquivo FROM fotos_ocorrencias "+
      "WHERE id_ocorrencia=? AND id_foto=? FOR UPDATE",[id,idFoto]
    );
    if(!rows[0])return err("Fotografia não encontrada.",404);
    await conn.execute("DELETE FROM fotos_ocorrencias WHERE id_ocorrencia=? AND id_foto=?",[id,idFoto]);
    await historico(conn,id,usuario.id,"Remoção de fotografia",1);
    await conn.commit();
    concluiu=true;
    const foto=rows[0];
    if(["LOCAL","AZURE_BLOB"].includes(String(foto.provedor))&&formatoFoto.test(String(foto.identificador_arquivo))){
      await excluirFoto(String(foto.identificador_arquivo),foto.provedor as ProvedorFoto)
        .catch(e=>console.warn("Arquivo já indisponível após exclusão",e));
    }
    return NextResponse.json({ok:true,fotos:await listar(conn,id)});
  }catch(error){
    console.error("Falha ao remover fotografia",error);
    return err("Não foi possível remover a fotografia.",500);
  }finally{
    if(conn){
      if(!concluiu)await conn.rollback().catch(()=>undefined);
      conn.release();
    }
  }
}
