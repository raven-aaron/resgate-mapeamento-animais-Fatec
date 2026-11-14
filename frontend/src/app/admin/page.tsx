import { redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2/promise";
import AdminShell from "../../components/admin/AdminShell";
import CardAdmin, { SecaoCards } from "../../components/admin/CardAdminResumo";
import { administradorAtual } from "../../lib/auth";
import { banco } from "../../lib/db";
import AppIcon from "@/components/AppIcon";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const usuario = await administradorAtual();
  if (!usuario?.adminResgate) redirect("/admin/login");

  const [rows] = await banco().query<RowDataPacket[]>(
    "SELECT COUNT(*) AS total, SUM(status_aprovacao='PENDENTE') AS pendentes, " +
      "SUM(status_aprovacao='APROVADO' AND status_caso='ABERTO') AS publicadas, " +
      "SUM(status_aprovacao='REJEITADO') AS rejeitadas " +
      "FROM ocorrencias WHERE excluido_em IS NULL",
  );
  const indicadores = rows[0];

  return (
    <AdminShell nome={usuario.nome} titulo="PAINEL GERAL">
      <SecaoCards titulo="Acesso rápido" variante="acesso">
        <CardAdmin
          variante="acesso"
          href="/admin/solicitacoes"
          titulo="Solicitações pendentes"
          icone={<AppIcon name="clock" />}
        />
        <CardAdmin
          variante="acesso"
          href="/admin/ocorrencias"
          titulo="Animais cadastrados"
          icone={<AppIcon name="pets" />}
        />
        <CardAdmin
          variante="acesso"
          href="/admin/estatisticas"
          titulo="Estatísticas"
          icone={<AppIcon name="statistics" />}
        />
        <CardAdmin
          variante="acesso"
          href="/admin/mapa-termico"
          titulo="Mapa térmico"
          icone={<AppIcon name="map" />}
        />
      </SecaoCards>

      <SecaoCards titulo="Resumo geral" variante="indicador">
        <CardAdmin
          variante="indicador"
          titulo={Number(indicadores.total || 0)}
          descricao="Ocorrências registradas"
        />
        <CardAdmin
          variante="indicador"
          titulo={Number(indicadores.pendentes || 0)}
          descricao="Aguardando análise"
        />
        <CardAdmin
          variante="indicador"
          titulo={Number(indicadores.publicadas || 0)}
          descricao="Publicadas e abertas"
        />
        <CardAdmin
          variante="indicador"
          titulo={Number(indicadores.rejeitadas || 0)}
          descricao="Rejeitadas"
        />
      </SecaoCards>
    </AdminShell>
  );
}
