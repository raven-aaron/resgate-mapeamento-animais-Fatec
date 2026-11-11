import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { banco } from "../../../../../lib/db";
import { usuarioAtual, administradorAtual } from "../../../../../lib/auth";
import { mesmaOrigem } from "../../../../../lib/seguranca";

export const runtime="nodejs";
type Contexto={params:Promise<{id:string}>};

async function acessoConversa(id:number,usuario:number){
  const [rows]=await banco().execute<RowDataPacket[]>(
    "SELECT c.id_conversa,c.situacao,c.id_ocorrencia,o.status_aprovacao,o.status_caso,o.excluido_em,"+
    "a.nome AS animal,o.tipo_ocorrencia AS tipo,interessado.nome AS interessado,dono.nome AS dono, "+
    "o.id_usuario_criador AS id_dono,c.id_usuario_interessado AS id_interessado "+
    "FROM conversas c JOIN ocorrencias o ON o.id_ocorrencia=c.id_ocorrencia "+
    "JOIN animais a ON a.id_animal=o.id_animal "+
    "JOIN usuarios dono ON dono.id_usuario=o.id_usuario_criador "+
    "JOIN usuarios interessado ON interessado.id_usuario=c.id_usuario_interessado "+
    "WHERE c.id_conversa=? AND (c.id_usuario_interessado=? OR o.id_usuario_criador=?) LIMIT 1",
    [id,usuario,usuario]
  );
  return rows[0];
}
export async function GET(_request:Request,contexto:Contexto){
  const usuario=(await usuarioAtual()) ?? (await administradorAtual());
  if(!usuario)return NextResponse.json({erro:"Sessão necessária."},{status:401});
  const {id:valor}=await contexto.params;
  if(!/^[1-9]\d{0,9}$/.test(valor))return NextResponse.json({erro:"Conversa inválida."},{status:400});
  try {
    const conversa=await acessoConversa(Number(valor),usuario.id);
    if(!conversa)return NextResponse.json({erro:"Conversa não encontrada."},{status:404});
    const [rows]=await banco().execute<RowDataPacket[]>(
      "SELECT m.id_mensagem AS id,m.conteudo,m.enviado_em AS data,m.id_remetente AS remetente,u.nome AS autor "+
      "FROM mensagens m JOIN usuarios u ON u.id_usuario=m.id_remetente "+
      "WHERE m.id_conversa=? ORDER BY m.id_mensagem DESC LIMIT 100",
      [Number(valor)]
    );
    return NextResponse.json({conversa:{
      id:Number(conversa.id_conversa),ocorrencia:Number(conversa.id_ocorrencia),
      animal:conversa.animal,tipo:conversa.tipo,
      interlocutor:Number(conversa.id_dono)===usuario.id?conversa.interessado:conversa.dono,
      situacao:conversa.situacao,podeEnviar:conversa.situacao==="ATIVA"&&conversa.status_aprovacao==="APROVADO"&&conversa.status_caso==="ABERTO"&&!conversa.excluido_em
    },mensagens:rows.reverse(),meuId:usuario.id},{headers:{"Cache-Control":"no-store"}});
  }catch(error){console.error("Erro na consulta de mensagens",error);return NextResponse.json({erro:"Falha ao consultar mensagens."},{status:500});}
}
// GET apenas consulta; o cliente confirma explicitamente a leitura quando o chat está visível.
export async function PATCH(request:Request,contexto:Contexto){
  if(!mesmaOrigem(request))return NextResponse.json({erro:"Origem inválida."},{status:403});
  const usuario=(await usuarioAtual()) ?? (await administradorAtual());
  if(!usuario)return NextResponse.json({erro:"Sessão necessária."},{status:401});
  const {id:valor}=await contexto.params;
  if(!/^[1-9]\d{0,9}$/.test(valor))return NextResponse.json({erro:"Conversa inválida."},{status:400});
  try{
    const dados=await request.json() as {ateId?:unknown};
    const ateId=Number(dados?.ateId);
    if(!Number.isSafeInteger(ateId)||ateId<1)return NextResponse.json({erro:"Mensagem inválida."},{status:400});
    const id=Number(valor);
    const conversa=await acessoConversa(id,usuario.id);
    if(!conversa)return NextResponse.json({erro:"Conversa não encontrada."},{status:404});
    const conn=await banco().getConnection();
    try{
      await conn.beginTransaction();
      await conn.execute(
        "UPDATE mensagens SET lida_em=UTC_TIMESTAMP(3) WHERE id_conversa=? AND id_remetente<>? AND id_mensagem<=? AND lida_em IS NULL",
        [id,usuario.id,ateId]
      );
      // Só confirma avisos até a mensagem recebida já exibida ao usuário.
      await conn.execute(
        "UPDATE notificacoes SET lida_em=UTC_TIMESTAMP(3) WHERE id_conversa=? AND id_usuario=? AND tipo='NOVA_MENSAGEM' "+
        "AND lida_em IS NULL AND criado_em <= DATE_ADD((SELECT MAX(enviado_em) FROM mensagens "+
        "WHERE id_conversa=? AND id_remetente<>? AND id_mensagem<=?), INTERVAL 1 SECOND)",
        [id,usuario.id,id,usuario.id,ateId]
      );
      await conn.commit();
      return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
    }catch(error){
      await conn.rollback().catch(()=>undefined);throw error;
    }finally{conn.release();}
  }catch(error){console.error("Falha ao confirmar leitura",error);return NextResponse.json({erro:"Não foi possível marcar como lida."},{status:500});}
}
export async function POST(request:Request,contexto:Contexto){
  if(!mesmaOrigem(request))return NextResponse.json({erro:"Origem inválida."},{status:403});
  const usuario=(await usuarioAtual()) ?? (await administradorAtual());
  if(!usuario)return NextResponse.json({erro:"Sessão necessária."},{status:401});
  const {id:valor}=await contexto.params;
  if(!/^[1-9]\d{0,9}$/.test(valor))return NextResponse.json({erro:"Conversa inválida."},{status:400});
  try {
    if(Number(request.headers.get("content-length")||0)>4500)return NextResponse.json({erro:"Mensagem muito extensa."},{status:413});
    const dados=await request.json();
    const conteudo=typeof dados.conteudo==="string"?dados.conteudo.trim():"";
    if(conteudo.length<1||conteudo.length>2000)return NextResponse.json({erro:"Escreva uma mensagem de até 2.000 caracteres."},{status:400});
    const conversa=await acessoConversa(Number(valor),usuario.id);
    if(!conversa)return NextResponse.json({erro:"Conversa não encontrada."},{status:404});
    if(conversa.situacao!=="ATIVA"||conversa.status_aprovacao!=="APROVADO"||conversa.status_caso!=="ABERTO"||conversa.excluido_em)
      return NextResponse.json({erro:"Esta conversa não aceita novas mensagens."},{status:409});
    const [recentes]=await banco().execute<RowDataPacket[]>(
      "SELECT COUNT(*) AS total FROM mensagens WHERE id_conversa=? AND id_remetente=? AND enviado_em >= DATE_SUB(UTC_TIMESTAMP(3),INTERVAL 2 SECOND)",
      [Number(valor),usuario.id]
    );
    if(Number(recentes[0]?.total||0)>=3)return NextResponse.json({erro:"Aguarde um instante antes de enviar mais mensagens."},{status:429});
    // Mensagem e notificação são gravadas na mesma transação.
    const conn=await banco().getConnection();
    try {
      await conn.beginTransaction();
      const [ins]=await conn.execute<ResultSetHeader>(
        "INSERT INTO mensagens (id_conversa,id_remetente,conteudo) VALUES (?,?,?)",
        [Number(valor),usuario.id,conteudo]
      );
      const destinatario=Number(conversa.id_dono)===usuario.id?
        Number(conversa.id_interessado):Number(conversa.id_dono);
      await conn.execute(
        "INSERT INTO notificacoes (id_usuario,modulo,tipo,id_ocorrencia,id_conversa,texto) "+
        "VALUES (?,'RESGATE','NOVA_MENSAGEM',?,?,'Você recebeu uma nova mensagem sobre um animal.')",
        [destinatario,Number(conversa.id_ocorrencia),Number(valor)]
      );
      await conn.commit();
      return NextResponse.json({id:ins.insertId},{status:201});
    } catch(error){
      await conn.rollback().catch(()=>undefined);
      throw error;
    } finally{conn.release();}
  }catch(error){console.error("Falha no envio de mensagem",error);return NextResponse.json({erro:"Não foi possível enviar a mensagem."},{status:500});}
}
