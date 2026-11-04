import { NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";
import { administradorAtual } from "../../../../lib/auth";
import { banco } from "../../../../lib/db";
export const runtime="nodejs";

export async function GET(){
  const usuario=await administradorAtual();
  if(!usuario?.adminResgate)return NextResponse.json({erro:"Acesso administrativo negado."},{status:403});
  try{
    const [rows]=await banco().query<RowDataPacket[]>(
      "SELECT ROUND(latitude_aproximada,2) AS latitude,ROUND(longitude_aproximada,2) AS longitude,"+
      "COUNT(*) AS total,SUM(tipo_ocorrencia='PERDIDO') AS perdidos,SUM(tipo_ocorrencia='ENCONTRADO') AS encontrados "+
      "FROM ocorrencias WHERE excluido_em IS NULL AND status_aprovacao='APROVADO' AND status_caso='ABERTO' "+
      "AND latitude_aproximada IS NOT NULL AND longitude_aproximada IS NOT NULL "+
      "GROUP BY ROUND(latitude_aproximada,2),ROUND(longitude_aproximada,2) ORDER BY total DESC LIMIT 100"
    );
    return NextResponse.json({zonas:rows},{headers:{"Cache-Control":"no-store"}});
  }catch(error){console.error("Falha no mapa térmico",error);return NextResponse.json({erro:"Não foi possível calcular a densidade."},{status:500});}
}
