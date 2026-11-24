import { notFound, redirect } from "next/navigation";
import { usuarioAtual } from "../../../../lib/auth";
import { buscarDadosParaEditar, buscarOpcoesParaEditar } from "../../../../models/edicao-ocorrencias";
import EditarOcorrencia from "../../../../components/ocorrencias/EditarOcorrencia";

export const dynamic="force-dynamic";
export default async function PaginaEditar({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!/^[1-9]\d{0,9}$/.test(id))notFound();
  const usuario=await usuarioAtual();
  if(!usuario)redirect("/login?retorno="+encodeURIComponent("/minhas-ocorrencias/"+id+"/editar"));
  const registro = await buscarDadosParaEditar(Number(id), usuario.id);
  if(!registro || registro.status_caso!=="ABERTO" ||
    !["PENDENTE","REJEITADO","APROVADO"].includes(registro.status_aprovacao))notFound();
  const opcoes = await buscarOpcoesParaEditar(Number(id), registro.id_especie);
  const dados={
    id:Number(registro.id),tipo:registro.tipo,status:registro.status_aprovacao,
    nome:registro.tipo==="PERDIDO"?(registro.nome||""):"",especie:registro.especie,sexo:registro.sexo,porte:registro.porte,
    idade:registro.idade||"",microchip:registro.microchip===null?"":registro.microchip===1?"SIM":"NAO",
    raca:registro.raca||"",cor:registro.cor||"",dataEvento:String(registro.data).slice(0,10),
    descricao:registro.descricao||"",referencia:registro.referencia||"",bairro:registro.bairro,cep:registro.cep||"",
  };
  return <EditarOcorrencia dados={dados} racas={opcoes.racas}
    cores={opcoes.cores}
    fotosIniciais={opcoes.fotos}/>;
}
