import { NextResponse } from "next/server";
import { encerrarSessao } from "../../../../../lib/auth";
import { mesmaOrigem } from "../../../../../lib/seguranca";
export const runtime="nodejs";
export async function POST(request:Request){
  if(!mesmaOrigem(request))return NextResponse.json({erro:"Origem não permitida."},{status:403});
  try{
    await encerrarSessao("administrador");
    return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("Erro ao encerrar sessão administrativa",error);
    return NextResponse.json({erro:"Não foi possível encerrar o acesso."},{status:500});
  }
}
