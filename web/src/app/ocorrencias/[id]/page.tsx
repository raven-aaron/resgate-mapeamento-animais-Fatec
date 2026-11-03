import { notFound } from "next/navigation";
import { buscarPublicaPorId, buscarFotosOcorrencia } from "../../../lib/ocorrencias";
import CartazPet from "../../../components/ocorrencias/CartazPet";

export default async function CartazPublico({params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  if(!/^[1-9]\d{0,9}$/.test(id))notFound();
  const o=await buscarPublicaPorId(Number(id));
  if(!o)notFound();
  const fotos=await buscarFotosOcorrencia(Number(id));
  return <main><CartazPet o={o} fotos={fotos}/></main>;
}
