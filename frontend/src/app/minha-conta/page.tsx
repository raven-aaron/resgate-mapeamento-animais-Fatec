import { redirect } from "next/navigation";
import LogoutButton from "../../components/auth/LogoutButton";
import CustomButton from "../../components/CustomButton";
import FormPage, { FormPanel } from "../../components/FormPage";
import { administradorAtual, usuarioAtual } from "../../lib/auth";

export const dynamic = "force-dynamic";

export default async function MinhaContaPage() {
  const administrador = await administradorAtual();
  const usuario = administrador || await usuarioAtual();
  if (!usuario) redirect("/login?retorno=%2Fminha-conta");

  return (
    <FormPage
      eyebrow={administrador ? "Área administrativa" : "Área do usuário"}
      title="MINHA CONTA"
      description={administrador ? "Dados da conta administrativa." : "Gerencie seus dados e ocorrências."}
    >
      <FormPanel aria-label="Dados da conta conectada">
        <h2>{usuario.nome}</h2>
        <p>
          <strong>E-mail:</strong> {usuario.email}
        </p>

        {administrador ? <div className="action-row">
          <CustomButton href="/admin" variant="gray">Voltar ao painel administrativo</CustomButton>
          <CustomButton href="/mensagens" variant="gray">Minhas conversas</CustomButton>
          <CustomButton href="/notificacoes" variant="outline">Notificações</CustomButton>
          <LogoutButton administrativo destino="/admin/login" texto="Sair da administração" />
        </div> : <>
          <div className="action-row">
            <CustomButton href="/mensagens" variant="gray">
              Minhas conversas
            </CustomButton>
            <CustomButton href="/notificacoes" variant="outline">
              Notificações
            </CustomButton>
            <CustomButton href="/minhas-ocorrencias" variant="orange">
              Minhas ocorrências
            </CustomButton>
          </div>

          <div className="action-row">
            <LogoutButton destino="/" texto="Sair da minha conta" />
          </div>
        </>}
      </FormPanel>
    </FormPage>
  );
}
