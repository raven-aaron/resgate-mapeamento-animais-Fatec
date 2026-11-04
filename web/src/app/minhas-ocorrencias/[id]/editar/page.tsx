import { notFound, redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2/promise";
import { usuarioAtual } from "../../../../lib/auth";
import { banco } from "../../../../lib/db";
import EditarOcorrencia from "../../../../components/ocorrencias/EditarOcorrencia";

type Registro = RowDataPacket & {
  id:number;tipo:"PERDIDO"|"ENCONTRADO";status_aprovacao:string;
  status_caso:string;nome:string|null;especie:string;id_especie:number;
  sexo:string;porte:string;idade:string|null;microchip:number|null;
  raca:string|null;cor:string|null;data:string;descricao:string|null;
  referencia:string|null;bairro:string;
};
export const dynamic="force-dynamic";
export default async function PaginaEditar({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!/^[1-9]\\d{0,9}$/.test(id))notFound();
  const usuario=await usuarioAtual();
  if(!usuario)redirect("/login?retorno="+encodeURIComponent("/minhas-ocorrencias/"+id+"/editar"));
  const [registros]=await banco().execute<Registro[]>(
    "SELECT o.id_ocorrencia AS id,o.tipo_ocorrencia AS tipo,o.status_aprovacao,o.status_caso,"+
    "a.nome,e.nome AS especie,a.id_especie,a.sexo,a.porte,a.idade_aproximada AS idade,"+
    "a.possui_microchip AS microchip,r.nome AS raca,"+
    "(SELECT c.nome FROM animais_cores ac JOIN cores c ON c.id_cor=ac.id_cor WHERE ac.id_animal=a.id_animal ORDER BY c.nome LIMIT 1) AS cor,"+
    "o.data_evento AS data,o.descricao,o.ponto_referencia AS referencia,b.nome AS bairro "+
    "FROM ocorrencias o JOIN animais a ON a.id_animal=o.id_animal "+
    "JOIN especies e ON e.id_especie=a.id_especie "+
    "JOIN bairros b ON b.id_bairro=o.id_bairro "+
    "LEFT JOIN racas r ON r.id_raca=a.id_raca "+
    "WHERE o.id_ocorrencia=? AND o.id_usuario_criador=? AND o.excluido_em IS NULL LIMIT 1",
    [Number(id),usuario.id]
  );
  const registro=registros[0];
  if(!registro || registro.status_caso!=="ABERTO" ||
    !["PENDENTE","REJEITADO","APROVADO"].includes(registro.status_aprovacao))notFound();
  const [racas]=await banco().execute<RowDataPacket[]>(
    "SELECT nome FROM racas WHERE id_especie=? AND ativo=1 ORDER BY nome",[registro.id_especie]
  );
  const [cores]=await banco().execute<RowDataPacket[]>(
    "SELECT nome FROM cores WHERE ativo=1 ORDER BY nome"
  );
  const dados={
    id:Number(registro.id),tipo:registro.tipo,status:registro.status_aprovacao,
    nome:registro.nome||"",especie:registro.especie,sexo:registro.sexo,porte:registro.porte,
    idade:registro.idade||"",microchip:registro.microchip===null?"":registro.microchip===1?"SIM":"NAO",
    raca:registro.raca||"",cor:registro.cor||"",dataEvento:String(registro.data).slice(0,10),
    descricao:registro.descricao||"",referencia:registro.referencia||"",bairro:registro.bairro,
  };
  return <EditarOcorrencia dados={dados} racas={racas.map(r=>String(r.nome))} cores={cores.map(c=>String(c.nome))}/>;
}
