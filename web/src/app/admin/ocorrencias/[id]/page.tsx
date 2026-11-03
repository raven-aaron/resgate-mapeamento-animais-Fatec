import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { usuarioAtual } from "../../../../lib/auth";
import { buscarAdministrativaPorId, buscarFotosOcorrencia } from "../../../../lib/ocorrencias";
import CartazPet from "../../../../components/ocorrencias/CartazPet";

export default async function CartazAdministrativo({params}:{params:Promise<{id:string}>}){
  const usuario=await usuarioAtual();
  if(!usuario?.adminResgate)redirect("/admin/login");
  const {id}=await params;
  if(!/^[1-9]\d{0,9}$/.test(id))notFound();
  const o=await buscarAdministrativaPorId(Number(id));
  if(!o)notFound();
  const fotos=await buscarFotosOcorrencia(Number(id));
  return <main><div className="site-wrap" style={{paddingTop:25}}>
      <Link href="/admin/solicitacoes" className="inline-action">← VOLTAR À ADMINISTRAÇÃO</Link>
    </div><CartazPet o={o} fotos={fotos} administrativo /></main>;
}
