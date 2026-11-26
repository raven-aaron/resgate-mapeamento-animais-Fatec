"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import AppIcon from "@/components/AppIcon";
import CustomButton from "../CustomButton";
import LogoutButton from "../auth/LogoutButton";
import { modulosMenuAdmin, type ModuloMenuAdmin } from "./menuAdmin";
import styles from "./AdminShell.module.css";
import Image from "next/image";

export default function AdminShell({
  nome,
  titulo,
  children,
}: {
  nome: string;
  titulo: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  const [gruposAbertos, setGruposAbertos] = useState<Record<string, boolean>>(
    {},
  );

  const itemAtivo = (href: string) =>
    pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));

  // Se a pessoa nunca clicou no grupo, ele começa aberto só se tiver a página atual dentro
  const grupoAberto = (modulo: ModuloMenuAdmin) =>
    gruposAbertos[modulo.id] ??
    modulo.itens.some((item) => itemAtivo(item.href));

  const alternarGrupo = (modulo: ModuloMenuAdmin) =>
    setGruposAbertos((atual) => ({
      ...atual,
      [modulo.id]: !grupoAberto(modulo),
    }));

  const renderMenu = (prefixo: string) =>
    modulosMenuAdmin.map((modulo) => {
      const aberto = grupoAberto(modulo);
      const idLista = `${prefixo}-${modulo.id}`;
      return (
        <div key={modulo.id} className={styles.grupo}>
          <CustomButton
            variant="admin"
            fullWidth
            aria-expanded={aberto}
            aria-controls={idLista}
            onClick={() => alternarGrupo(modulo)}
          >
            <AppIcon name={modulo.icone} />
            <span className={styles.grupoTitulo}>{modulo.titulo}</span>
            <AppIcon
              name="expandMore"
              className={`${styles.seta} ${aberto ? styles.setaAberta : ""}`}
            />
          </CustomButton>
          {aberto && (
            <div id={idLista} className={styles.grupoItens}>
              {modulo.itens.map(({ href, label, icone }) => (
                <CustomButton
                  key={href}
                  href={href}
                  variant="admin"
                  fullWidth
                  aria-current={itemAtivo(href) ? "page" : undefined}
                  onClick={() => setMenuAberto(false)}
                >
                  <AppIcon name={icone} />
                  <span>{label}</span>
                </CustomButton>
              ))}
            </div>
          )}
        </div>
      );
    });

  return (
    <main className={styles.area}>
      <div className={styles.mobileMenuToggleWrap}>
        <button
          type="button"
          className={styles.mobileMenuToggle}
          onClick={() => setMenuAberto(true)}
        >
          Menu ADM
        </button>
      </div>

      {menuAberto && (
        <button
          type="button"
          className={styles.mobileMenuBackdrop}
          aria-label="Fechar menu administrativo"
          onClick={() => setMenuAberto(false)}
        />
      )}

      <aside
        className={styles.menuAdmContainer}
        aria-label="Navegação administrativa"
      >
        <div className={styles.cabecalho}>
          <div className={styles.logos}>
            <Image
              src="/assets/logo_Bem-EstarAnimal_2.png"
              alt="Departamento de Proteção e Bem-Estar Animal"
              width={173}
              height={80}
              className={styles.logo}
            />
            <Image
              src="/assets/logo_prefeituraVotorantim.png"
              alt="Prefeitura Municipal de Votorantim"
              width={120}
              height={60}
              className={styles.logo}
            />
          </div>
          <h2>Painel Administrativo</h2>
        </div>
        <nav className={styles.menuLinks}>{renderMenu("desktop")}</nav>
        <div className={styles.menuAcoes}>
          <p>
            Conectado com: <Link href="/minha-conta">{nome}</Link>
          </p>
          <CustomButton href="/" variant="admin" fullWidth>
            <AppIcon name="logout" />
            Voltar ao site
          </CustomButton>
          <LogoutButton administrativo destino="/admin/login" texto="Sair da administração" />
        </div>
      </aside>

      <aside
        className={`${styles.mobileMenuPanel} ${menuAberto ? styles.mobileMenuPanelOpen : ""}`}
        aria-label="Menu administrativo em mobile"
        aria-modal={menuAberto}
        role="dialog"
        aria-hidden={!menuAberto}
        inert={!menuAberto}
      >
        <div className={styles.mobileMenuHeader}>
          <div className={styles.mobileMenuTitleWrap}>
            <span className={styles.selo}>Acesso restrito</span>
            <h2>MENU ADM</h2>
          </div>
          <button
            type="button"
            className={styles.mobileMenuClose}
            aria-label="Fechar menu administrativo"
            onClick={() => setMenuAberto(false)}
          >
            &times;
          </button>
        </div>
        <nav className={styles.mobileMenuLinks}>{renderMenu("mobile")}</nav>
        <div className={styles.mobileMenuActions}>
          <p>
            Conectado com:{" "}
            <Link href="/minha-conta" onClick={() => setMenuAberto(false)}>
              {nome}
            </Link>
          </p>
          <CustomButton
            href="/"
            variant="admin"
            fullWidth
            onClick={() => setMenuAberto(false)}
          >
            <AppIcon name="logout" />
            Voltar ao site
          </CustomButton>
          <LogoutButton administrativo destino="/admin/login" texto="Sair da administração" />
        </div>
      </aside>

      <section className={styles.conteudo}>
        <header className={styles.cabecalhoAdm}>
          <div className={styles.cabecalhoAdmTitulo}>
            <AppIcon name="dashboard" />
            <span>Painel Administrativo</span>
          </div>
          <span className={styles.cabecalhoAdmSaudacao}>
            Olá, <Link href="/minha-conta">{nome}</Link>
          </span>
        </header>

        <div className={styles.corpo}>
          <div className={styles.titulo}>
            <span className="eyebrow">Administração • Resgate</span>
            <h1>{titulo}</h1>
          </div>
          {children}
        </div>
      </section>
    </main>
  );
}
