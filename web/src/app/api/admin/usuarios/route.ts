import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { banco } from "../../../../lib/db";
import { administradorAtual } from "../../../../lib/auth";
import { mesmaOrigem } from "../../../../lib/seguranca";

export const runtime="nodejs";
type Acao="SUSPENDER"|"REATIVAR"|"CONCEDER_ADMIN"|"REVOGAR_ADMIN";
const acoes:Acao[]=["SUSPENDER","REATIVAR","CONCEDER_ADMIN","REVOGAR_ADMIN"];

export async function PATCH(request:Request){
  if(!mesmaOrigem(request))return NextResponse.json({erro:"Origem não permitida."},{status:403});
  const solicitante=await administradorAtual();
  if(!solicitante?.adminResgate)return NextResponse.json({erro:"Acesso administrativo negado."},{status:403});
  if(Number(request.headers.get("content-length")||0)>4096)return NextResponse.json({erro:"Dados inválidos."},{status:413});
  try{
    const dados=await request.json() as {id?:unknown;acao?:unknown;confirmacao?:unknown};
    const id=Number(dados.id);
    const acao=dados.acao;
    const confirmacao=typeof dados.confirmacao==="string"?dados.confirmacao.trim().toLowerCase():"";
    if(!Number.isSafeInteger(id)||id<1||!acoes.includes(acao as Acao)||!confirmacao||confirmacao.length>254)
      return NextResponse.json({erro:"Confirme a ação e o e-mail da conta."},{status:400});
    if(id===solicitante.id)return NextResponse.json({erro:"Não é permitido alterar a própria conta administrativa."},{status:409});
    const conn=await banco().getConnection();
    try{
      await conn.beginTransaction();
      const [linhas]=await conn.execute<RowDataPacket[]>(
        "SELECT id_usuario,email,situacao FROM usuarios WHERE id_usuario=? FOR UPDATE",[id]
      );
      const alvo=linhas[0];
      if(!alvo){await conn.rollback();return NextResponse.json({erro:"Conta não encontrada."},{status:404});}
      if(String(alvo.email).toLowerCase()!==confirmacao){
        await conn.rollback();return NextResponse.json({erro:"O e-mail de confirmação não corresponde à conta."},{status:400});
      }
      // Trava as permissões antes de contar administradores: duas requisições simultâneas
      // não podem remover o último administrador ativo do módulo.
      const [admins]=await conn.execute<RowDataPacket[]>(
        "SELECT p.id_usuario FROM permissoes_usuarios p "+
        "JOIN usuarios u ON u.id_usuario=p.id_usuario "+
        "WHERE p.modulo='RESGATE' AND p.papel='ADMIN' AND u.situacao='ATIVO' FOR UPDATE"
      );
      if(!admins.some(a=>Number(a.id_usuario)===solicitante.id)){
        await conn.rollback();return NextResponse.json({erro:"Sua permissão administrativa foi alterada. Entre novamente."},{status:403});
      }
      const alvoAdmin=admins.some(a=>Number(a.id_usuario)===id);
      const ativo=String(alvo.situacao)==="ATIVO";
      let sql="";
      let valores:number[]=[];
      switch(acao){
        case "SUSPENDER":
          if(!ativo||alvoAdmin)break;
          sql="UPDATE usuarios SET situacao='SUSPENSO' WHERE id_usuario=?";valores=[id];break;
        case "REATIVAR":
          if(alvo.situacao!=="SUSPENSO")break;
          sql="UPDATE usuarios SET situacao='ATIVO' WHERE id_usuario=?";valores=[id];break;
        case "CONCEDER_ADMIN":
          if(!ativo||alvoAdmin)break;
          sql="INSERT INTO permissoes_usuarios (id_usuario,modulo,papel) VALUES (?,'RESGATE','ADMIN')";
          valores=[id];break;
        case "REVOGAR_ADMIN":
          if(!ativo||!alvoAdmin||admins.length<=1)break;
          sql="DELETE FROM permissoes_usuarios WHERE id_usuario=? AND modulo='RESGATE'";valores=[id];break;
      }
      if(!sql){
        await conn.rollback();
        return NextResponse.json({erro:"Ação não permitida nesta situação. É necessário manter ao menos um administrador ativo."},{status:409});
      }
      await conn.execute(sql,valores);
      // Elimina sessões antigas após promoção, revogação ou suspensão.
      await conn.execute(
        "UPDATE sessoes SET revogada_em=UTC_TIMESTAMP(3) WHERE id_usuario=? AND revogada_em IS NULL",[id]
      );
      await conn.execute(
        "INSERT INTO auditoria (id_usuario_responsavel,modulo,acao,entidade,id_registro,detalhe) "+
        "VALUES (?,'CONTAS',?,'usuarios',?,'Gestão administrativa auditada no Resgate')",
        [solicitante.id,String(acao),id]
      );
      await conn.commit();
      return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
    }catch(error){await conn.rollback().catch(()=>undefined);throw error;}
    finally{conn.release();}
  }catch(error){console.error("Falha ao gerenciar usuário",error);
    return NextResponse.json({erro:"Não foi possível alterar a conta."},{status:500});
  }
}
