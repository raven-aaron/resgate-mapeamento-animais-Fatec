import { redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2/promise";
import { administradorAtual } from "../../../lib/auth";
import { banco } from "../../../lib/db";
import AdminShell from "../../../components/admin/AdminShell";
export const dynamic="force-dynamic";
export default async function Estatisticas() {
  const usuario=await administradorAtual();
  if(!usuario?.adminResgate)redirect("/admin/login");
  const [total]=await banco().query<RowDataPacket[]>(
    "SELECT e.nome AS especie,o.tipo_ocorrencia AS tipo,COUNT(*) AS total FROM ocorrencias o JOIN animais a ON a.id_animal=o.id_animal JOIN especies e ON e.id_especie=a.id_especie WHERE o.excluido_em IS NULL GROUP BY e.nome,o.tipo_ocorrencia ORDER BY e.nome,o.tipo_ocorrencia"
  );
  const [bairros]=await banco().query<RowDataPacket[]>(
    "SELECT b.nome AS bairro,COUNT(*) AS total FROM ocorrencias o JOIN bairros b ON b.id_bairro=o.id_bairro WHERE o.excluido_em IS NULL GROUP BY b.id_bairro,b.nome ORDER BY total DESC LIMIT 8"
  );
  return <AdminShell nome={usuario.nome} titulo="ESTATÍSTICAS">
    <h2>Distribuição por espécie e situação</h2>
    <div className="admin-kpis">{total.map((r,i)=><div key={i}><strong>{Number(r.total)}</strong><span>{r.especie} — {r.tipo==="PERDIDO"?"Perdidos":r.tipo==="ENCONTRADO"?"Encontrados":r.tipo}</span></div>)}</div>
    {total.length===0 && <p className="note">Ainda não existem ocorrências para gerar indicadores.</p>}
    <h2>Ocorrências por bairro</h2>
    <div>{bairros.map(r=><div key={r.bairro} className="admin-ocorrencias-bairro"><span>{r.bairro}</span><strong>{Number(r.total)} ocorrência(s)</strong></div>)}</div>
    {bairros.length===0 && <p className="note">Nenhuma ocorrência por bairro.</p>}
  </AdminShell>;
}
