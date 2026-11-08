"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import LogoutButton from "../auth/LogoutButton";
import styles from "./AdminShell.module.css";

export default function AdminShell({ nome, titulo, children }: { nome: string; titulo: string; children: ReactNode }) {
  const pathname = usePathname();
  const opcoesMenu = [
    { href: "/admin", label: "Painel geral" },
    { href: "/admin/solicitacoes", label: "Solicitações pendentes" },
    { href: "/admin/ocorrencias", label: "Animais cadastrados" },
    { href: "/admin/estatisticas", label: "Estatísticas" },
    { href: "/admin/mapa-termico", label: "Mapa térmico" },
    { href: "/admin/usuarios", label: "Contas cadastradas" },
    { href: "/admin/cadastro-animal", label: "Cadastro de Animal" },
  ] as const;

  return <main className={styles.area}>
    <aside className={styles.menuAdmContainer} aria-label="Navegação administrativa">
      <div className={styles.cabecalho}><span className={styles.selo}>Acesso restrito</span><h2>MENU ADM</h2><p>Resgate e Mapeamento</p></div>
      <nav className={styles.menuLinks}>
        {opcoesMenu.map(({ href, label }) => {
          const ativo = pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
          return <Link key={href} href={href} aria-current={ativo ? "page" : undefined}>{label}</Link>;
        })}
      </nav>
      <div className={styles.menuAcoes}><p>Conectado com: <Link href="/minha-conta">{nome}</Link></p><LogoutButton administrativo destino="/admin/login" texto="Sair da administração" /></div>
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
