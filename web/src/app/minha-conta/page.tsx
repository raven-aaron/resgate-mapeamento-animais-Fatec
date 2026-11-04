import Link from "next/link";
import { redirect } from "next/navigation";
import { usuarioAtual } from "../../lib/auth";
import LogoutButton from "../../components/auth/LogoutButton";

export const dynamic="force-dynamic";
export default async function MinhaContaPage(){
  const usuario=await usuarioAtual();
  if(!usuario)redirect("/login?retorno=%2Fminha-conta");
  return <main className="form-shell">
    <header className="form-heading">
      <span className="eyebrow">Área do cidadão</span>
      <h1>MINHA CONTA</h1>
      <p>Gerencie seus dados e ocorrências.</p>
    </header>
    <section className="form-panel" aria-label="Dados da conta conectada">
      <h2>{usuario.nome}</h2>
      <p><strong>E-mail:</strong> {usuario.email}</p>
      <div className="action-row">
        <Link className="action action-primary" href="/mensagens">Minhas conversas</Link>
        <Link className="action action-secondary" href="/notificacoes">Notificações</Link>
        <Link className="action action-secondary" href="/minhas-ocorrencias">Minhas ocorrências</Link>
      </div>
      <div className="action-row"><LogoutButton destino="/" texto="Sair da minha conta"/></div>
    </section>
  </main>;
}
