import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { banco } from "../../../lib/db";
import { usuarioAtual, administradorAtual } from "../../../lib/auth";
import { mesmaOrigem } from "../../../lib/seguranca";

export const runtime="nodejs";

export async function GET(){
  const usuario=(await usuarioAtual()) ?? (await administradorAtual());
  if(!usuario)return NextResponse.json({erro:"Entre na sua conta."},{status:401});
  try{
    const [avisos]=await banco().execute<RowDataPacket[]>(
      "SELECT id_notificacao AS id,tipo,texto,id_ocorrencia AS ocorrencia,id_conversa AS conversa,"+
      "criado_em AS data,lida_em AS lida FROM notificacoes WHERE id_usuario=? "+
      "ORDER BY id_notificacao DESC LIMIT 60",[usuario.id]
    );
    const [contadores]=await banco().execute<RowDataPacket[]>(
      "SELECT (SELECT COUNT(*) FROM notificacoes WHERE id_usuario=? AND lida_em IS NULL) AS avisos,"+
      "(SELECT COUNT(*) FROM mensagens m JOIN conversas c ON c.id_conversa=m.id_conversa "+
      "JOIN ocorrencias o ON o.id_ocorrencia=c.id_ocorrencia "+
      "WHERE (o.id_usuario_criador=? OR c.id_usuario_interessado=?) "+
      "AND m.id_remetente<>? AND m.lida_em IS NULL) AS mensagens,"+
      "(SELECT COALESCE(MAX(m.id_mensagem),0) FROM mensagens m "+
      "JOIN conversas c ON c.id_conversa=m.id_conversa "+
      "JOIN ocorrencias o ON o.id_ocorrencia=c.id_ocorrencia "+
      "WHERE (o.id_usuario_criador=? OR c.id_usuario_interessado=?) "+
      "AND m.id_remetente<>? AND m.lida_em IS NULL) AS ultimaMensagemNaoLida",
      [usuario.id,usuario.id,usuario.id,usuario.id,usuario.id,usuario.id,usuario.id]
    );
    return NextResponse.json({notificacoes:avisos,naoLidas:Number(contadores[0]?.avisos||0),
      mensagensNaoLidas:Number(contadores[0]?.mensagens||0),
      ultimaMensagemNaoLida:Number(contadores[0]?.ultimaMensagemNaoLida||0)},{headers:{"Cache-Control":"private, no-store"}});
  }catch(error){
    console.error("Erro ao consultar notificações",error);
    return NextResponse.json({erro:"Não foi possível consultar seus avisos."},{status:500});
  }
}
export async function PATCH(request:Request){
  if(!mesmaOrigem(request))return NextResponse.json({erro:"Origem não permitida."},{status:403});
  const usuario=(await usuarioAtual()) ?? (await administradorAtual());
  if(!usuario)return NextResponse.json({erro:"Entre na sua conta."},{status:401});
  try{
    const data=await request.json() as {id?:number;todas?:boolean};
    const id=Number(data.id);
    if(data.todas===true){
      await banco().execute(
        "UPDATE notificacoes SET lida_em=UTC_TIMESTAMP(3) WHERE id_usuario=? AND lida_em IS NULL",
        [usuario.id]
      );
    } else if(Number.isSafeInteger(id)&&id>0){
      await banco().execute(
        "UPDATE notificacoes SET lida_em=UTC_TIMESTAMP(3) WHERE id_usuario=? AND id_notificacao=? AND lida_em IS NULL",
        [usuario.id,id]
      );
    }else return NextResponse.json({erro:"Notificação inválida."},{status:400});
    return NextResponse.json({ok:true});
  }catch(error){
    console.error("Erro ao marcar notificação",error);
    return NextResponse.json({erro:"Não foi possível marcar o aviso."},{status:500});
  }
}
