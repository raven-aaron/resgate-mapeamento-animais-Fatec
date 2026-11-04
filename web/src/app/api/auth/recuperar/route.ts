import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { randomBytes, createHash } from "node:crypto";
import { banco } from "../../../../lib/db";
import { mesmaOrigem } from "../../../../lib/seguranca";

export const runtime="nodejs";
const tentativas=new Map<string,number>();
export async function POST(request:Request){
  if(!mesmaOrigem(request))return NextResponse.json({erro:"Origem inválida."},{status:403});
  if(!process.env.RESEND_API_KEY||!process.env.MAIL_FROM||!process.env.APP_PUBLIC_URL)
    return NextResponse.json({erro:"A recuperação por e-mail ainda não foi configurada neste ambiente."},{status:503});
  const ip=(request.headers.get("x-forwarded-for")||"local").split(",")[0].slice(0,70);
  const ultima=tentativas.get(ip)||0;
  if(Date.now()-ultima<30_000)return NextResponse.json({erro:"Aguarde antes de solicitar outro link."},{status:429});
  tentativas.set(ip,Date.now());
  try{
    if(Number(request.headers.get("content-length")||0)>4096)return NextResponse.json({erro:"Dados inválidos."},{status:413});
    const dados=await request.json();
    const nome=typeof dados.nome==="string"?dados.nome.trim():"";
    const email=typeof dados.email==="string"?dados.email.trim().toLowerCase():"";
    if(nome.length<2||nome.length>100||!/^([^\s@]+)@([^\s@]+)\.([^\s@]+)$/.test(email))
      return NextResponse.json({erro:"Informe nome e e-mail válidos."},{status:400});
    const [rows]=await banco().execute<RowDataPacket[]>(
      "SELECT id_usuario FROM usuarios WHERE nome=? AND email=? AND situacao='ATIVO' LIMIT 1",[nome,email]
    );
    if(rows.length){
      const token=randomBytes(32).toString("hex");
      const hash=createHash("sha256").update(token).digest("hex");
      await banco().execute(
        "INSERT INTO recuperacoes_senha (id_usuario,token_hash,expira_em) VALUES (?,UNHEX(?),DATE_ADD(UTC_TIMESTAMP(3),INTERVAL 30 MINUTE))",
        [Number(rows[0].id_usuario),hash]
      );
      const app=process.env.APP_PUBLIC_URL!.replace(/\/$/,"");
      const url=new URL(app);
      if(url.protocol!=="https:"&&url.hostname!=="localhost"&&url.hostname!=="127.0.0.1")
        return NextResponse.json({erro:"Configuração de endereço público inválida."},{status:503});
      const link=app+"/redefinir-senha?token="+token;
      const resposta=await fetch("https://api.resend.com/emails",{
        method:"POST",headers:{"Authorization":"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json"},
        body:JSON.stringify({from:process.env.MAIL_FROM,to:[email],subject:"Recuperação de senha - Bem-Estar Animal",
          text:"Você solicitou a redefinição de senha. Acesse o link em até 30 minutos: "+link+"\nSe não fez a solicitação, ignore este e-mail."}),
        signal:AbortSignal.timeout(10000)
      });
      if(!resposta.ok){
        console.error("Falha do serviço de envio de recuperação:",resposta.status);
        return NextResponse.json({erro:"Não foi possível enviar o e-mail. Tente novamente mais tarde."},{status:502});
      }
    }
    return NextResponse.json({mensagem:"Se os dados corresponderem a uma conta ativa, o link de recuperação será enviado ao e-mail informado."});
  }catch(error){
    console.error("Falha no pedido de recuperação:",error);
    return NextResponse.json({erro:"Não foi possível processar o pedido de recuperação."},{status:500});
  }
}
