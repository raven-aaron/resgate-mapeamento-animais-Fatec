import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { RowDataPacket } from "mysql2/promise";
import { banco } from "../../../../lib/db";
import { usuarioAtual } from "../../../../lib/auth";

export const runtime="nodejs";
export async function GET(_request:Request,{params}:{params:Promise<{arquivo:string}>}){
  const {arquivo}=await params;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/.test(arquivo))
    return new Response("Arquivo não encontrado.",{status:404});
  try {
    const [rows]=await banco().execute<RowDataPacket[]>(
      "SELECT o.id_usuario_criador,o.status_aprovacao,o.status_caso,o.excluido_em "+
      "FROM fotos_ocorrencias f JOIN ocorrencias o ON o.id_ocorrencia=f.id_ocorrencia "+
      "WHERE f.provedor='LOCAL' AND f.identificador_arquivo=? LIMIT 1",[arquivo]
    );
    const o=rows[0];
    if(!o)return new Response("Arquivo não encontrado.",{status:404});
    const publico=o.status_aprovacao==="APROVADO"&&o.status_caso==="ABERTO"&&!o.excluido_em;
    if(!publico){
      const usuario=await usuarioAtual();
      if(!usuario||(!usuario.adminResgate&&usuario.id!==Number(o.id_usuario_criador)))
        return new Response("Arquivo não encontrado.",{status:404});
    }
    const conteudo=await readFile(join(process.cwd(),"storage","uploads",arquivo));
    const tipo=arquivo.endsWith(".jpg")?"image/jpeg":arquivo.endsWith(".png")?"image/png":"image/webp";
    return new Response(new Uint8Array(conteudo),{
      headers:{"Content-Type":tipo,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Content-Disposition":"inline"},
    });
  }catch(error){
    console.error("Falha ao obter foto cadastrada",error);
    return new Response("Arquivo indisponível.",{status:404});
  }
}
