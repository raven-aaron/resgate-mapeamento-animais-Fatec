import { redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2/promise";
import { usuarioAtual } from "../../../lib/auth";
import { banco } from "../../../lib/db";
import AdminShell from "../../../components/admin/AdminShell";
import MapaCalorAdministrativo from "../../../components/admin/MapaCalorAdministrativo";
export const dynamic="force-dynamic";
export default async function MapaTermico() {
  const usuario=await usuarioAtual();
  if(!usuario?.adminResgate)redirect("/admin/login");
  const [bairros]=await banco().query<RowDataPacket[]>(
    "SELECT b.nome AS bairro,COUNT(*) AS total FROM ocorrencias o JOIN bairros b ON b.id_bairro=o.id_bairro WHERE o.excluido_em IS NULL AND o.status_aprovacao='APROVADO' GROUP BY b.id_bairro,b.nome ORDER BY total DESC LIMIT 12"
  );
  const maximo=Math.max(1,...bairros.map(r=>Number(r.total)));
  return <AdminShell nome={usuario.nome} titulo="MAPA TÉRMICO — DENSIDADE">
    <p>Concentração espacial de ocorrências aprovadas e abertas. O mapa usa dados agregados em zonas, enquanto o ranking abaixo mostra os bairros com mais registros.</p>
    <MapaCalorAdministrativo />
    {bairros.map(r=><div key={r.bairro} className="admin-barra">
      <span>{r.bairro}</span><div><i style={{width:(Number(r.total)/maximo*100)+"%"}}/></div><strong>{Number(r.total)}</strong>
    </div>)}
    {bairros.length===0 && <p className="note">Aguardando ocorrências aprovadas para formar a análise territorial.</p>}
  </AdminShell>;
}
