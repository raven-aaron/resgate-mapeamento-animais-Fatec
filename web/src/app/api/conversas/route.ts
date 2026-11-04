import { NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";
import { banco } from "../../../lib/db";
import { usuarioAtual } from "../../../lib/auth";
import { mesmaOrigem } from "../../../lib/seguranca";

export const runtime="nodejs";

export async function GET() {
  try {
    const usuario=await usuarioAtual();
    if(!usuario)return NextResponse.json({erro:"Entre na sua conta.",login:true},{status:401});
    const [rows]=await banco().execute<RowDataPacket[]>(
      "SELECT c.id_conversa AS id,c.situacao,o.id_ocorrencia AS ocorrencia,o.tipo_ocorrencia AS tipo,"+
      "a.nome AS animal,e.nome AS especie,"+
      "IF(c.id_usuario_interessado=?,dono.nome,interessado.nome) AS interlocutor,"+
      "(SELECT m.conteudo FROM mensagens m WHERE m.id_conversa=c.id_conversa ORDER BY m.id_mensagem DESC LIMIT 1) AS ultimaMensagem,"+
      "(SELECT m.enviado_em FROM mensagens m WHERE m.id_conversa=c.id_conversa ORDER BY m.id_mensagem DESC LIMIT 1) AS ultimaData,"+
      "(SELECT COUNT(*) FROM mensagens m WHERE m.id_conversa=c.id_conversa AND m.id_remetente<>? AND m.lida_em IS NULL) AS naoLidas "+
      "FROM conversas c JOIN ocorrencias o ON o.id_ocorrencia=c.id_ocorrencia "+
      "JOIN animais a ON a.id_animal=o.id_animal JOIN especies e ON e.id_especie=a.id_especie "+
      "JOIN usuarios dono ON dono.id_usuario=o.id_usuario_criador "+
      "JOIN usuarios interessado ON interessado.id_usuario=c.id_usuario_interessado "+
      "WHERE (c.id_usuario_interessado=? OR o.id_usuario_criador=?) AND o.excluido_em IS NULL "+
      "ORDER BY c.atualizado_em DESC LIMIT 100",[usuario.id,usuario.id,usuario.id,usuario.id]
    );
    return NextResponse.json({conversas:rows},{headers:{"Cache-Control":"no-store"}});
  } catch(error){console.error("Erro de listagem de conversas",error);return NextResponse.json({erro:"Não foi possível carregar conversas."},{status:500});}
}

export async function POST(request:Request){
  if(!mesmaOrigem(request))return NextResponse.json({erro:"Origem inválida."},{status:403});
  const usuario=await usuarioAtual();
  if(!usuario)return NextResponse.json({erro:"Entre para iniciar uma conversa.",login:true},{status:401});
  try {
    if(Number(request.headers.get("content-length")||0)>1000)return NextResponse.json({erro:"Dados inválidos."},{status:413});
    const body=await request.json();
    const id=Number(body.ocorrencia);
    if(!Number.isSafeInteger(id)||id<1)return NextResponse.json({erro:"Ocorrência inválida."},{status:400});
    const [rows]=await banco().execute<RowDataPacket[]>(
      "SELECT id_usuario_criador,status_aprovacao,status_caso,excluido_em FROM ocorrencias WHERE id_ocorrencia=? LIMIT 1",[id]
    );
    const o=rows[0];
    if(!o||o.status_aprovacao!=="APROVADO"||o.status_caso!=="ABERTO"||o.excluido_em)
      return NextResponse.json({erro:"A ocorrência não está disponível para contato."},{status:404});
    if(Number(o.id_usuario_criador)===usuario.id)
      return NextResponse.json({erro:"Você é responsável por este cartaz. Consulte suas mensagens recebidas."},{status:409});
    const [criado]=await banco().execute<ResultSetHeader>(
      "INSERT INTO conversas (id_ocorrencia,id_usuario_interessado) VALUES (?,?) "+
      "ON DUPLICATE KEY UPDATE id_conversa=LAST_INSERT_ID(id_conversa)",
      [id,usuario.id]
    );
    return NextResponse.json({id:criado.insertId},{status:200});
  }catch(error){
    console.error("Erro ao iniciar conversa",error);
    return NextResponse.json({erro:"Não foi possível iniciar o chat."},{status:500});
  }
}
