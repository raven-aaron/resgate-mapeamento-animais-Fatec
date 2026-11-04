import { NextResponse } from "next/server";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { buscarPublicaPorId } from "../../../../lib/ocorrencias";
import { banco } from "../../../../lib/db";
import { usuarioAtual } from "../../../../lib/auth";
import { mesmaOrigem } from "../../../../lib/seguranca";

export const runtime = "nodejs";
type Contexto = { params: Promise<{ id: string }> };
type Linha = RowDataPacket & {
  id_animal: number; id_usuario_criador: number; id_especie: number;
  tipo_ocorrencia: "PERDIDO" | "ENCONTRADO";
  status_aprovacao: string; status_caso: string;
};
const padraoId = /^[1-9]\d{0,9}$/;
const nomeValido = /^[\p{L}\p{M}\s.'-]{0,80}$/u;

function texto(valor: unknown, max: number) {
  return typeof valor === "string" ? valor.trim().slice(0,max) : "";
}
function dataValida(valor: string) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(valor))return false;
  const data=new Date(valor+"T12:00:00Z");
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0,10)===valor &&
    valor<=new Date().toISOString().slice(0,10);
}
function respostaErro(mensagem: string, status: number){
  return NextResponse.json({erro:mensagem},{status});
}
async function proprietario(conn: PoolConnection,id:number,usuario:number) {
  const [linhas]=await conn.execute<Linha[]>(
    "SELECT o.id_animal,o.id_usuario_criador,o.tipo_ocorrencia,o.status_aprovacao,o.status_caso,"+
    "a.id_especie FROM ocorrencias o JOIN animais a ON a.id_animal=o.id_animal "+
    "WHERE o.id_ocorrencia=? AND o.id_usuario_criador=? AND o.excluido_em IS NULL FOR UPDATE",
    [id,usuario]
  );
  return linhas[0] || null;
}
async function historico(conn:PoolConnection,id:number,usuario:number,acao:string,
  antes:Record<string,unknown>,depois:Record<string,unknown>,motivo:string|null=null){
  await conn.execute(
    "INSERT INTO historico_ocorrencias "+
    "(id_ocorrencia,id_usuario_responsavel,acao,motivo,dados_anteriores,dados_novos) "+
    "VALUES (?,?,?,?,?,?)",
    [id,usuario,acao,motivo,JSON.stringify(antes),JSON.stringify(depois)]
  );
  await conn.execute(
    "INSERT INTO auditoria (id_usuario_responsavel,modulo,acao,entidade,id_registro,detalhe) "+
    "VALUES (?,'RESGATE',?,'ocorrencias',?,?)",
    [usuario,acao,id,motivo]
  );
}
export async function GET(_request: Request, context: Contexto) {
  const { id } = await context.params;
  if (!padraoId.test(id)) return respostaErro("Identificador inválido.",400);
  try {
    const ocorrencia = await buscarPublicaPorId(Number(id));
    if (!ocorrencia) return respostaErro("Ocorrência não encontrada.",404);
    return NextResponse.json({ ocorrencia }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return respostaErro("Erro na consulta da ocorrência.",500);
  }
}

export async function PATCH(request:Request,context:Contexto) {
  if(!mesmaOrigem(request))return respostaErro("Origem não permitida.",403);
  const usuario=await usuarioAtual();
  if(!usuario)return respostaErro("Entre na sua conta para gerenciar esta ocorrência.",401);
  const {id:identificador}=await context.params;
  if(!padraoId.test(identificador))return respostaErro("Identificador inválido.",400);
  if(Number(request.headers.get("content-length")||0)>12000)return respostaErro("Dados muito extensos.",413);
  let conn:PoolConnection|null=null;
  try {
    const dados=await request.json() as Record<string,unknown>;
    if(!dados||typeof dados!=="object"||Array.isArray(dados))return respostaErro("Dados inválidos.",400);
    const acao=dados.acao;
    if(acao!=="EDITAR" && acao!=="ENCERRAR")return respostaErro("Ação inválida.",400);
    const id=Number(identificador);
    conn=await banco().getConnection();
    await conn.beginTransaction();
    const o=await proprietario(conn,id,usuario.id);
    if(!o){await conn.rollback();return respostaErro("Ocorrência não encontrada na sua conta.",404);}
    if(o.status_caso!=="ABERTO"){await conn.rollback();return respostaErro("Esta ocorrência já foi encerrada.",409);}

    if(acao==="ENCERRAR"){
      const motivo=texto(dados.motivo,50);
      const detalhe=texto(dados.detalhe,500);
      const motivos=["REENCONTRADO","DEVOLVIDO_AO_TUTOR","DUPLICIDADE","OUTRO"];
      if(!motivos.includes(motivo)||
        (motivo==="REENCONTRADO"&&o.tipo_ocorrencia!=="PERDIDO")||
        (motivo==="DEVOLVIDO_AO_TUTOR"&&o.tipo_ocorrencia!=="ENCONTRADO")||
        (motivo==="OUTRO"&&detalhe.length<5)){
        await conn.rollback();return respostaErro("Selecione o motivo e forneça os detalhes necessários.",400);
      }
      const estado=motivo==="REENCONTRADO"||motivo==="DEVOLVIDO_AO_TUTOR"?"RESOLVIDO":"ENCERRADO";
      await conn.execute(
        "UPDATE ocorrencias SET status_caso=?,motivo_encerramento=?,detalhe_encerramento=?, "+
        "encerrado_em=UTC_TIMESTAMP(3) WHERE id_ocorrencia=?",
        [estado,motivo,detalhe||null,id]
      );
      await conn.execute(
        "UPDATE conversas SET situacao='ENCERRADA' WHERE id_ocorrencia=? AND situacao='ATIVA'",[id]
      );
      await historico(conn,id,usuario.id,"ENCERRAMENTO",{status_caso:o.status_caso},{status_caso:estado},motivo);
      await conn.commit();
      return NextResponse.json({ok:true,mensagem:"Ocorrência encerrada com sucesso."});
    }

    if(!["PENDENTE","REJEITADO","APROVADO"].includes(o.status_aprovacao)){
      await conn.rollback();return respostaErro("Esta ocorrência não está disponível para edição.",409);
    }
    const nome=texto(dados.nome,80);
    const sexo=texto(dados.sexo,20);
    const porte=texto(dados.porte,20);
    const idade=texto(dados.idade,30);
    const microchip=texto(dados.microchip,10);
    const raca=texto(dados.raca,80);
    const cor=texto(dados.cor,50);
    const descricao=texto(dados.descricao,4000);
    const referencia=texto(dados.referencia,255);
    const dataEvento=texto(dados.dataEvento,10);
    if((o.tipo_ocorrencia==="PERDIDO"&&!nome)||
      !nomeValido.test(nome)||!["","MACHO","FEMEA"].includes(sexo)||
      !["","PEQUENO","MEDIO","GRANDE"].includes(porte)||
      !["","SIM","NAO"].includes(microchip)||!dataValida(dataEvento)){
      await conn.rollback();return respostaErro("Revise os campos e a data da ocorrência.",400);
    }
    if(/@|(?:\+?\d[\s().-]*){10,}/.test(descricao+" "+referencia)){
      await conn.rollback();return respostaErro("Não informe telefone, e-mail ou endereço residencial.",400);
    }
    let idRaca:number|null=null;
    if(raca){
      const [racas]=await conn.execute<RowDataPacket[]>(
        "SELECT id_raca AS id FROM racas WHERE id_especie=? AND nome=? AND ativo=1 LIMIT 1",
        [o.id_especie,raca]
      );
      if(!racas.length){await conn.rollback();return respostaErro("Raça inválida para a espécie.",400);}
      idRaca=Number(racas[0].id);
    }
    let idCor:number|null=null;
    if(cor){
      const [cores]=await conn.execute<RowDataPacket[]>(
        "SELECT id_cor AS id FROM cores WHERE nome=? AND ativo=1 LIMIT 1",[cor]
      );
      if(!cores.length){await conn.rollback();return respostaErro("Cor inválida.",400);}
      idCor=Number(cores[0].id);
    }
    await conn.execute(
      "UPDATE animais SET nome=?,sexo=?,porte=?,idade_aproximada=?,possui_microchip=?,"+
      "id_raca=?,caracteristicas=? WHERE id_animal=?",
      [nome||null,sexo||"INDETERMINADO",porte||"INDETERMINADO",idade||null,
        microchip===""?null:microchip==="SIM"?1:0,idRaca,descricao||null,o.id_animal]
    );
    await conn.execute("DELETE FROM animais_cores WHERE id_animal=?",[o.id_animal]);
    if(idCor)await conn.execute(
      "INSERT INTO animais_cores (id_animal,id_cor) VALUES (?,?)",[o.id_animal,idCor]
    );
    // Cada edição deve voltar para moderação antes de aparecer publicamente.
    await conn.execute(
      "UPDATE ocorrencias SET ponto_referencia=?,descricao=?,data_evento=?,"+
      "status_aprovacao='PENDENTE' WHERE id_ocorrencia=?",
      [referencia||null,descricao||null,dataEvento,id]
    );
    await historico(conn,id,usuario.id,"EDICAO",
      {status_aprovacao:o.status_aprovacao},{status_aprovacao:"PENDENTE",campos_revisados:true});
    await conn.commit();
    return NextResponse.json({ok:true,mensagem:"Alterações enviadas para nova análise."});
  }catch(error){
    if(conn)await conn.rollback().catch(()=>undefined);
    console.error("Falha ao atualizar ocorrência",error);
    return respostaErro("Não foi possível atualizar a ocorrência.",500);
  }finally{conn?.release();}
}

export async function DELETE(request:Request,context:Contexto) {
  if(!mesmaOrigem(request))return respostaErro("Origem não permitida.",403);
  const usuario=await usuarioAtual();
  if(!usuario)return respostaErro("Entre na sua conta.",401);
  const {id:identificador}=await context.params;
  if(!padraoId.test(identificador))return respostaErro("Identificador inválido.",400);
  let conn:PoolConnection|null=null;
  try{
    const id=Number(identificador);
    conn=await banco().getConnection();
    await conn.beginTransaction();
    const o=await proprietario(conn,id,usuario.id);
    if(!o){await conn.rollback();return respostaErro("Ocorrência não encontrada na sua conta.",404);}
    await conn.execute("UPDATE ocorrencias SET excluido_em=UTC_TIMESTAMP(3) WHERE id_ocorrencia=?",[id]);
    await conn.execute("UPDATE conversas SET situacao='ENCERRADA' WHERE id_ocorrencia=? AND situacao='ATIVA'",[id]);
    await historico(conn,id,usuario.id,"EXCLUSAO",
      {excluido:false,status_aprovacao:o.status_aprovacao},{excluido:true});
    await conn.commit();
    return NextResponse.json({ok:true,mensagem:"Cadastro removido das listagens."});
  }catch(error){
    if(conn)await conn.rollback().catch(()=>undefined);
    console.error("Falha ao excluir ocorrência",error);
    return respostaErro("Não foi possível excluir a ocorrência.",500);
  }finally{conn?.release();}
}
