"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import LogoutButton from "../auth/LogoutButton";
import styles from "./AdminShell.module.css";

export default function AdminShell({ nome, titulo, children }: { nome: string; titulo: string; children: ReactNode }) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const opcoesMenu = [
    { href: "/admin", label: "Painel geral" },
    { href: "/admin/solicitacoes", label: "Solicitações pendentes" },
    { href: "/admin/ocorrencias", label: "Animais cadastrados" },
    { href: "/admin/estatisticas", label: "Estatísticas" },
    { href: "/admin/mapa-termico", label: "Mapa térmico" },
    { href: "/admin/usuarios", label: "Contas cadastradas" },
    { href: "/admin/cadastro-animal", label: "Cadastrar animal encontrado" },
  ] as const;

  const renderMenu = () => opcoesMenu.map(({ href, label }) => {
    const ativo = pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
    return <Link key={href} href={href} aria-current={ativo ? "page" : undefined} onClick={() => setMenuAberto(false)}>{label}</Link>;
  });

  return <main className={styles.area}>
    <div className={styles.mobileMenuToggleWrap}>
      <button type="button" className={styles.mobileMenuToggle} onClick={() => setMenuAberto(true)}>
        Menu ADM
      </button>
    </div>

    {menuAberto && <button type="button" className={styles.mobileMenuBackdrop} aria-label="Fechar menu administrativo" onClick={() => setMenuAberto(false)} />}

    <aside className={styles.menuAdmContainer} aria-label="Navegação administrativa">
      <div className={styles.cabecalho}><span className={styles.selo}>Acesso restrito</span><h2>MENU ADM</h2><p>Resgate e Mapeamento</p></div>
      <nav className={styles.menuLinks}>{renderMenu()}</nav>
      <div className={styles.menuAcoes}><p>Conectado com: <Link href="/minha-conta">{nome}</Link></p><LogoutButton administrativo destino="/admin/login" texto="Sair da administração" /></div>
    </aside>

    <aside className={`${styles.mobileMenuPanel} ${menuAberto ? styles.mobileMenuPanelOpen : ""}`} aria-label="Menu administrativo em mobile" aria-modal="true" role="dialog">
      <div className={styles.mobileMenuHeader}>
        <div className={styles.mobileMenuTitleWrap}>
          <span className={styles.selo}>Acesso restrito</span>
          <h2>MENU ADM</h2>
        </div>
        <button type="button" className={styles.mobileMenuClose} aria-label="Fechar menu administrativo" onClick={() => setMenuAberto(false)}>&times;</button>
      </div>
      <nav className={styles.mobileMenuLinks}>{renderMenu()}</nav>
      <div className={styles.mobileMenuActions}><p>Conectado com: <Link href="/minha-conta" onClick={() => setMenuAberto(false)}>{nome}</Link></p><LogoutButton administrativo destino="/admin/login" texto="Sair da administração" /></div>
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
