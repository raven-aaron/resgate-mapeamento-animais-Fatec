import { redirect } from "next/navigation";
import AdminShell from "../../components/admin/AdminShell";
import CardAdmin, { SecaoCards } from "../../components/admin/CardAdminResumo";
import { administradorAtual } from "../../lib/auth";
import { consultarIndicadoresAdministrativos } from "../../models/administracao";
import AppIcon from "@/components/AppIcon";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const usuario = await administradorAtual();
  if (!usuario?.adminResgate) redirect("/admin/login");

  // Preserva a consulta do módulo de administração utilizada na main.
  const indicadores = await consultarIndicadoresAdministrativos();

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
