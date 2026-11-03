import { redirect } from "next/navigation";
import { usuarioAtual } from "../../../lib/auth";
import AdminShell from "../../../components/admin/AdminShell";
import GerenciarOcorrencias from "../../../components/admin/GerenciarOcorrencias";
export const dynamic="force-dynamic";
export default async function Gerenciar() {
  const usuario=await usuarioAtual();
  if(!usuario?.adminResgate)redirect("/admin/login");
  return <AdminShell nome={usuario.nome} titulo="ANIMAIS CADASTRADOS"><GerenciarOcorrencias status="TODAS"/></AdminShell>;
}
