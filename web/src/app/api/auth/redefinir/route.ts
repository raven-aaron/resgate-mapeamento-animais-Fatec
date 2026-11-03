import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { banco } from "../../../../lib/db";
import { gerarSenhaHash } from "../../../../lib/auth";
import { mesmaOrigem } from "../../../../lib/seguranca";
export const runtime="nodejs";

export async function POST(request:Request){
  if(!mesmaOrigem(request))return NextResponse.json({erro:"Origem inválida."},{status:403});
  try{
    if(Number(request.headers.get("content-length")||0)>4096)return NextResponse.json({erro:"Dados inválidos."},{status:413});
    const dados=await request.json();
    const token=typeof dados.token==="string"?dados.token:"";
    const senha=typeof dados.senha==="string"?dados.senha:"";
    if(!/^[a-f0-9]{64}$/.test(token)||senha.length<10||senha.length>128)
      return NextResponse.json({erro:"Link inválido ou senha fora do limite de 10 a 128 caracteres."},{status:400});
    const hashToken=createHash("sha256").update(token).digest("hex");
    const novaSenha=await gerarSenhaHash(senha);
    const conexao=await banco().getConnection();
    try{
      await conexao.beginTransaction();
      const [rows]=await conexao.execute<RowDataPacket[]>(
        "SELECT r.id_recuperacao,r.id_usuario FROM recuperacoes_senha r JOIN usuarios u ON u.id_usuario=r.id_usuario "+
        "WHERE r.token_hash=UNHEX(?) AND r.utilizado_em IS NULL AND r.expira_em>UTC_TIMESTAMP(3) AND u.situacao='ATIVO' FOR UPDATE",
        [hashToken]
      );
      if(!rows.length){
        await conexao.rollback();
        return NextResponse.json({erro:"O link de recuperação expirou ou já foi utilizado."},{status:400});
      }
      const id=Number(rows[0].id_usuario);
      await conexao.execute("UPDATE usuarios SET senha_hash=? WHERE id_usuario=?",[novaSenha,id]);
      await conexao.execute("UPDATE recuperacoes_senha SET utilizado_em=UTC_TIMESTAMP(3) WHERE id_recuperacao=?",[Number(rows[0].id_recuperacao)]);
      await conexao.execute("UPDATE sessoes SET revogada_em=UTC_TIMESTAMP(3) WHERE id_usuario=? AND revogada_em IS NULL",[id]);
      await conexao.commit();
      return NextResponse.json({mensagem:"Senha atualizada. Faça login com a nova senha."});
    }catch(error){await conexao.rollback();throw error;}
    finally{conexao.release();}
  }catch(error){
    console.error("Falha ao redefinir senha",error);
    return NextResponse.json({erro:"Não foi possível redefinir a senha."},{status:500});
  }
}
