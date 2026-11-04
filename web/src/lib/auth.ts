import "server-only";
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import type { RowDataPacket } from "mysql2/promise";
import { banco } from "./db";

const scrypt=promisify(scryptCallback);
type Perfil="cidadao"|"administrador";
const COOKIES:Record<Perfil,string>={cidadao:"resgate_sessao",administrador:"resgate_admin_sessao"};
const HORAS=12;
const DIAS_LONGOS=30;
export type UsuarioSessao={id:number;nome:string;email:string;adminResgate:boolean};

export async function gerarSenhaHash(senha:string){
  const salt=randomBytes(16).toString("hex");
  const chave=(await scrypt(senha,salt,64)) as Buffer;
  return "scrypt$"+salt+"$"+chave.toString("hex");
}
export async function compararSenha(senha:string,hash:string){
  const partes=hash.split("$");
  if(partes.length!==3||partes[0]!=="scrypt"||!/^[0-9a-f]{32}$/.test(partes[1])||!/^[0-9a-f]{128}$/.test(partes[2]))return false;
  const esperado=Buffer.from(partes[2],"hex");
  const recebido=(await scrypt(senha,partes[1],esperado.length)) as Buffer;
  return timingSafeEqual(recebido,esperado);
}
function hashToken(token:string){return createHash("sha256").update(token).digest("hex");}

export async function criarSessao(idUsuario:number,manterConectado=true,perfil:Perfil="cidadao"){
  const persistente=perfil==="cidadao"&&manterConectado;
  const duracaoSegundos=persistente?DIAS_LONGOS*24*3600:HORAS*3600;
  const jar=await cookies();
  const nomeCookie=COOKIES[perfil];
  const anterior=jar.get(nomeCookie)?.value;
  const token=randomBytes(32).toString("hex");
  const conn=await banco().getConnection();
  try{
    await conn.beginTransaction();
    await conn.execute(
      "INSERT INTO sessoes (id_usuario,token_hash,expira_em) VALUES (?,UNHEX(?),DATE_ADD(UTC_TIMESTAMP(3),INTERVAL ? SECOND))",
      [idUsuario,hashToken(token),duracaoSegundos]
    );
    if(anterior&&/^[a-f0-9]{64}$/.test(anterior)){
      await conn.execute(
        "UPDATE sessoes SET revogada_em=UTC_TIMESTAMP(3) WHERE token_hash=UNHEX(?) AND revogada_em IS NULL",
        [hashToken(anterior)]
      );
    }
    await conn.commit();
  }catch(error){await conn.rollback().catch(()=>undefined);throw error;}
  finally{conn.release();}
  jar.set(nomeCookie,token,{
    httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",
    ...(persistente?{maxAge:duracaoSegundos}:{})
  });
}

export async function encerrarSessao(perfil:Perfil="cidadao"){
  const jar=await cookies();
  const nomeCookie=COOKIES[perfil];
  const token=jar.get(nomeCookie)?.value;
  if(token&&/^[a-f0-9]{64}$/.test(token)){
    await banco().execute("UPDATE sessoes SET revogada_em=UTC_TIMESTAMP(3) WHERE token_hash=UNHEX(?) AND revogada_em IS NULL",[hashToken(token)]);
  }
  jar.delete(nomeCookie);
}
async function consultarSessao(perfil:Perfil):Promise<UsuarioSessao|null>{
  const token=(await cookies()).get(COOKIES[perfil])?.value;
  if(!token||!/^[a-f0-9]{64}$/.test(token))return null;
  const sql="SELECT u.id_usuario AS id,u.nome,u.email,"+
    "EXISTS(SELECT 1 FROM permissoes_usuarios p WHERE p.id_usuario=u.id_usuario AND p.modulo='RESGATE' AND p.papel='ADMIN') AS adminResgate "+
    "FROM sessoes s JOIN usuarios u ON u.id_usuario=s.id_usuario "+
    "WHERE s.token_hash=UNHEX(?) AND s.revogada_em IS NULL AND s.expira_em>UTC_TIMESTAMP(3) AND u.situacao='ATIVO' LIMIT 1";
  const [linhas]=await banco().execute<RowDataPacket[]>(sql,[hashToken(token)]);
  const u=linhas[0];
  if(!u)return null;
  const usuario={id:Number(u.id),nome:String(u.nome),email:String(u.email),adminResgate:Boolean(u.adminResgate)};
  if(perfil==="administrador"&&!usuario.adminResgate)return null;
  return usuario;
}
export async function usuarioAtual():Promise<UsuarioSessao|null>{return consultarSessao("cidadao");}
export async function administradorAtual():Promise<UsuarioSessao|null>{return consultarSessao("administrador");}
