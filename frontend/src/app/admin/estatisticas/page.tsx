import { redirect } from "next/navigation";
import { administradorAtual } from "../../../lib/auth";
import AdminShell from "../../../components/admin/AdminShell";
import PainelEstatisticas from "../../../components/admin/PainelEstatisticas";

export const dynamic="force-dynamic";

export default async function Estatisticas() {
  const usuario = await administradorAtual();
  if (!usuario?.adminResgate) redirect("/admin/login");

  return <AdminShell nome={usuario.nome} titulo="ESTATÍSTICAS">
    <PainelEstatisticas />
  </AdminShell>;
}
