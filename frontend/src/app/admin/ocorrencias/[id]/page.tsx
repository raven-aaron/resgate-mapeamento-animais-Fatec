import { notFound, redirect } from "next/navigation";
import { administradorAtual } from "../../../../lib/auth";
import { buscarAdministrativaPorId, buscarFotosOcorrencia } from "../../../../lib/ocorrencias";
import CartazPet from "../../../../components/ocorrencias/CartazPet";
import CustomButton from "../../../../components/CustomButton";

export default async function CartazAdministrativo({params}:{params:Promise<{id:string}>}){
  const usuario=await administradorAtual();
  if(!usuario?.adminResgate)redirect("/admin/login");
  const {id}=await params;
  if(!/^[1-9]\d{0,9}$/.test(id))notFound();
  const o=await buscarAdministrativaPorId(Number(id));
  if(!o)notFound();
  const fotos=await buscarFotosOcorrencia(Number(id));
  return <main><div className="site-wrap" style={{paddingTop:25}}>
      <CustomButton href="/admin/solicitacoes" variant="red" size="small">← VOLTAR À ADMINISTRAÇÃO</CustomButton>
    </div><CartazPet o={o} fotos={fotos} administrativo /></main>;
}
