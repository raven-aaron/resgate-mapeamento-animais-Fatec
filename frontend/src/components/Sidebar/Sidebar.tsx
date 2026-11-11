"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import AppIcon from "../AppIcon";
import CustomButton from "../CustomButton";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

type PerfilMenu = "verificando" | "visitante" | "cidadao" | "administrador" | "indisponivel";
type ItemMenu = { href: string; label: string };

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [perfil, setPerfil] = useState<PerfilMenu>("verificando");

  useEffect(() => {
    if (!isOpen) return;
    let ativo = true;

    const verificarSessao = async () => {
      if (ativo) setPerfil("verificando");
      try {
        const [respostaCidadao, respostaAdmin] = await Promise.all([
          fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" }),
          fetch("/api/auth/admin/me", { cache: "no-store", credentials: "same-origin" }),
        ]);
        if (!respostaCidadao.ok || !respostaAdmin.ok) {
          throw new Error("Não foi possível consultar a sessão.");
        }
        const cidadao = await respostaCidadao.json() as { usuario?: { id: number } | null };
        const admin = await respostaAdmin.json() as { usuario?: { adminResgate: boolean } | null };
        if (ativo) {
          setPerfil(cidadao.usuario
            ? "cidadao"
            : admin.usuario?.adminResgate === true ? "administrador" : "visitante");
        }
      } catch {
        if (ativo) setPerfil("indisponivel");
      }
    };

    void verificarSessao();
    window.addEventListener("resgate-auth", verificarSessao);
    return () => {
      ativo = false;
      window.removeEventListener("resgate-auth", verificarSessao);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const fecharComEscape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") onClose();
    };
    document.addEventListener("keydown", fecharComEscape);
    return () => document.removeEventListener("keydown", fecharComEscape);
  }, [isOpen, onClose]);

  const itens: ItemMenu[] = [];
  if (perfil === "cidadao") {
    itens.push(
      { href: "/minha-conta", label: "Meu perfil" },
      { href: "/minhas-ocorrencias", label: "Minhas ocorrências" },
    );
  } else if (perfil === "administrador") {
    itens.push(
      { href: "/admin", label: "Painel administrativo" },
      { href: "/admin/solicitacoes", label: "Aprovar ocorrências" },
    );
  }

  if (perfil === "administrador") {
    // A API restringe o cadastro administrativo a animais encontrados.
    itens.push({ href: "/admin/cadastro-animal", label: "Cadastrar animal encontrado" });
  } else {
    itens.push(
      { href: "/registro-pet-perdido", label: "Cadastrar animal perdido" },
      { href: "/registro-pet-encontrado", label: "Cadastrar animal encontrado" },
    );
  }

  itens.push(
    { href: "/mapa", label: "Ver animais no mapa" },
    { href: "/animais", label: "Ver animais em cartazes" },
  );

  if (perfil === "cidadao" || perfil === "administrador") {
    itens.push(
      { href: "/mensagens", label: "Minhas conversas" },
      { href: "/notificacoes", label: "Notificações" },
    );
  }

  return (
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayVisible : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}
        aria-label="Menu do módulo de resgate"
        aria-hidden={!isOpen}
      >
        <header className={styles.headerMenu}>
          <div className={styles.badgeMenu}>
            <AppIcon name="pets" className="ui-icon" />
            <span>RESGATE DE ANIMAIS</span>
          </div>
          <CustomButton type="button" size="icon" variant="gray"
            className={styles.btnClose} aria-label="Fechar menu" onClick={onClose}>×</CustomButton>
        </header>
        <div className={styles.conteudo}>
          <h2 className={styles.tituloMenu}>ÁREA DO RESGATE</h2>
          {perfil === "verificando" ? (
            <p role="status">Verificando sua conta…</p>
          ) : perfil === "indisponivel" ? (
            <p role="alert">Não foi possível verificar sua sessão. Feche e abra o menu novamente.</p>
          ) : (
            <nav aria-label="Ações e consultas do resgate">
              <ul className={styles.listaMenu}>
                {itens.map(item => {
                  const destino = item.href.split("?")[0];
                  const atual = pathname === destino || (destino !== "/" && pathname.startsWith(destino + "/"));
                  return (
                    <li key={item.href} className={styles.itemMenu}>
                      <Link href={item.href} className={styles.linkMenu}
                        aria-current={atual ? "page" : undefined} onClick={onClose}>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
              {perfil === "visitante" && (
                <div className={styles.areaAcesso}>
                  <h3 className={styles.tituloMenu}>SUA CONTA</h3>
                  <Link href="/login" className={styles.linkMenu} onClick={onClose}>Entrar</Link>
                  <Link href="/cadastro" className={styles.linkMenu} onClick={onClose}>Criar conta</Link>
                </div>
              )}
            </nav>
          )}
        </div>
      </aside>
    </>
  );
}
