import { NextResponse } from "next/server";
import { administradorAtual } from "../../../../../lib/auth";
export const runtime="nodejs";
export async function GET(){
  try{
    const usuario=await administradorAtual();
    return NextResponse.json({usuario},{headers:{"Cache-Control":"private, no-store"}});
  }catch{return NextResponse.json({erro:"Falha ao consultar acesso administrativo."},{status:500});}
}
