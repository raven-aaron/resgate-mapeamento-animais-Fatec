import { redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2/promise";
import AdminShell from "../../components/admin/AdminShell";
import CustomButton from "../../components/CustomButton";
import { administradorAtual } from "../../lib/auth";
import { banco } from "../../lib/db";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const usuario = await administradorAtual();
  if (!usuario?.adminResgate) redirect("/admin/login");

  const [rows] = await banco().query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total, SUM(status_aprovacao='PENDENTE') AS pendentes, " +
    "SUM(status_aprovacao='APROVADO' AND status_caso='ABERTO') AS publicadas, " +
    "SUM(status_aprovacao='REJEITADO') AS rejeitadas " +
    "FROM ocorrencias WHERE excluido_em IS NULL"
  );
  const indicadores = rows[0];

  return (
    <AdminShell nome={usuario.nome} titulo="PAINEL ADMINISTRATIVO">
      <div className="admin-kpis">
        <div>
          <strong>{Number(indicadores.total || 0)}</strong>
          <span>Ocorrências registradas</span>
        </div>
        <div>
          <strong>{Number(indicadores.pendentes || 0)}</strong>
          <span>Aguardando análise</span>
        </div>
        <div>
          <strong>{Number(indicadores.publicadas || 0)}</strong>
          <span>Publicadas e abertas</span>
        </div>
        <div>
          <strong>{Number(indicadores.rejeitadas || 0)}</strong>
          <span>Rejeitadas</span>
        </div>
      </div>

      <div className="action-row">
        <CustomButton href="/admin/solicitacoes" variant="green">
          ANALISAR SOLICITAÇÕES
        </CustomButton>
        <CustomButton href="/admin/ocorrencias" variant="gray">
          GERENCIAR ANIMAIS
        </CustomButton>
      </div>
    </AdminShell>
  );
}
