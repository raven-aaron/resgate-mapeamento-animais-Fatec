import { redirect } from "next/navigation";
import LogoutButton from "../../components/auth/LogoutButton";
import CustomButton from "../../components/CustomButton";
import { usuarioAtual } from "../../lib/auth";

export const dynamic = "force-dynamic";

export default async function MinhaContaPage() {
  const usuario = await usuarioAtual();
  if (!usuario) redirect("/login?retorno=%2Fminha-conta");

  return (
    <main className="form-shell">
      <header className="form-heading">
        <span className="eyebrow">Área do usuário</span>
        <h1>MINHA CONTA</h1>
        <p>Gerencie seus dados e ocorrências.</p>
      </header>

      <section className="form-panel" aria-label="Dados da conta conectada">
        <h2>{usuario.nome}</h2>
        <p>
          <strong>E-mail:</strong> {usuario.email}
        </p>

        <div className="action-row">
          <CustomButton href="/mensagens" variant="green">
            Minhas conversas
          </CustomButton>
          <CustomButton href="/notificacoes" variant="gray">
            Notificações
          </CustomButton>
          <CustomButton href="/minhas-ocorrencias" variant="gray">
            Minhas ocorrências
          </CustomButton>
        </div>

        <div className="action-row">
          <LogoutButton destino="/" texto="Sair da minha conta" />
        </div>
      </section>
    </main>
  );
}
