import Link from "next/link";
import type { ReactNode } from "react";
import LogoutButton from "../auth/LogoutButton";
import styles from "./AdminShell.module.css";

export default function AdminShell({ nome, titulo, children }: { nome: string; titulo: string; children: ReactNode }) {
  return <main className={styles.area}>
    <aside className={styles.menuAdmContainer} aria-label="Navegação administrativa">
      <div className={styles.cabecalho}><span className={styles.selo}>Acesso restrito</span><h2>MENU ADM</h2><p>Resgate e Mapeamento</p></div>
      <nav className={styles.menuLinks}>
        <Link href="/admin">Painel geral</Link>
        <Link href="/admin/solicitacoes">Solicitações pendentes</Link>
        <Link href="/admin/ocorrencias">Animais cadastrados</Link>
        <Link href="/admin/estatisticas">Estatísticas</Link>
        <Link href="/admin/mapa-termico">Mapa térmico</Link>
        <Link href="/admin/usuarios">Contas cadastradas</Link>
      </nav>
      <div className={styles.menuAcoes}><p>Conectado: <strong>{nome}</strong></p><LogoutButton administrativo destino="/admin/login" texto="Sair da administração" /></div>
    </aside>
    <section className={styles.conteudo}>
      <div className={styles.titulo}>
        <span className="eyebrow">Administração • Resgate</span>
        <h1>{titulo}</h1>
      </div>
      {children}
    </section>
  </main>;
}
