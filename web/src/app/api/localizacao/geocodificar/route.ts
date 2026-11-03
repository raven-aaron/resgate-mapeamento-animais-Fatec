import { NextRequest, NextResponse } from "next/server";
import { ErroLocalizacao, localizarBairroPorCep } from "../../../../lib/localizacao-cep";

export const runtime="nodejs";
export async function GET(request:NextRequest){
  try{
    const cep=request.nextUrl.searchParams.get("cep")||"";
    const regiao=await localizarBairroPorCep(cep);
    return NextResponse.json({
      ...regiao,
      aviso:"A localização pública será exibida de forma aproximada no bairro informado.",
    },{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    if(error instanceof ErroLocalizacao)
      return NextResponse.json({erro:error.message},{status:error.status});
    console.error("Erro na consulta da região",error);
    return NextResponse.json({erro:"Não foi possível consultar a localização."},{status:503});
  }
}
