import { redirect } from "next/navigation";
import { administradorAtual } from "../../../lib/auth";
import AdminShell from "../../../components/admin/AdminShell";
import MapaTermico from "../../../components/admin/MapaTermico";

export const dynamic = "force-dynamic";

export default async function PaginaMapaTermico() {
  const usuario = await administradorAtual();
  if (!usuario?.adminResgate) redirect("/admin/login");

  return <AdminShell nome={usuario.nome} titulo="MAPA TÉRMICO — DENSIDADE">
    <MapaTermico />
  </AdminShell>;
}
