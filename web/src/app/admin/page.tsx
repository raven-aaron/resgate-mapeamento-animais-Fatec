import Link from "next/link";
import { redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2/promise";
import { administradorAtual } from "../../lib/auth";
import { banco } from "../../lib/db";
import AdminShell from "../../components/admin/AdminShell";

export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const usuario=await administradorAtual();
  if(!usuario?.adminResgate)redirect("/admin/login");
  const [rows]=await banco().query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total, SUM(status_aprovacao='PENDENTE') AS pendentes, " +
    "SUM(status_aprovacao='APROVADO' AND status_caso='ABERTO') AS publicadas, " +
    "SUM(status_aprovacao='REJEITADO') AS rejeitadas " +
    "FROM ocorrencias WHERE excluido_em IS NULL"
  );
  const r=rows[0];
  return <AdminShell nome={usuario.nome} titulo="PAINEL ADMINISTRATIVO">
    <div className="admin-kpis">
      <div><strong>{Number(r.total||0)}</strong><span>Ocorrências registradas</span></div>
      <div><strong>{Number(r.pendentes||0)}</strong><span>Aguardando análise</span></div>
      <div><strong>{Number(r.publicadas||0)}</strong><span>Publicadas e abertas</span></div>
      <div><strong>{Number(r.rejeitadas||0)}</strong><span>Rejeitadas</span></div>
    </div>
    <div className="action-row">
      <Link href="/admin/solicitacoes" className="action action-primary">ANALISAR SOLICITAÇÕES</Link>
      <Link href="/admin/ocorrencias" className="action action-secondary">GERENCIAR ANIMAIS</Link>
    </div>
  </AdminShell>;
}
