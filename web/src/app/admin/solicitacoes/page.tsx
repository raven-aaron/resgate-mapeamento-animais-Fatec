import { redirect } from "next/navigation";
import { administradorAtual } from "../../../lib/auth";
import AdminShell from "../../../components/admin/AdminShell";
import GerenciarOcorrencias from "../../../components/admin/GerenciarOcorrencias";
export const dynamic="force-dynamic";
export default async function Solicitacoes() {
  const usuario=await administradorAtual();
  if(!usuario?.adminResgate)redirect("/admin/login");
  return <AdminShell nome={usuario.nome} titulo="SOLICITAÇÕES"><GerenciarOcorrencias status="PENDENTE"/></AdminShell>;
}
