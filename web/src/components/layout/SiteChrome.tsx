"use client";

import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./SiteChrome.module.css";

// O logotipo maior ainda é servido do repositório original público.
// Substituir pelo mesmo arquivo em /public/assets para demonstração offline.
const logoBemEstar = "https://raw.githubusercontent.com/raven-aaron/Projeto-Resgate-e-Mapeamento-FATEC/main/ProjetoNext/public/assets/logo_Bem-EstarAnimal_2.png";

export default function SiteChrome({ children }: { children: ReactNode }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [altoContraste, setAltoContraste] = useState(false);
  const [tamanhoFonte, setTamanhoFonte] = useState(16);

  useEffect(() => {
    document.body.classList.toggle(styles.altoContraste, altoContraste);
    return () => document.body.classList.remove(styles.altoContraste);
  }, [altoContraste]);

  useEffect(() => {
    document.documentElement.style.fontSize = tamanhoFonte + "px";
    return () => { document.documentElement.style.fontSize = ""; };
  }, [tamanhoFonte]);

  useEffect(() => {
    if (!menuAberto) return;
    function fecharEscape(evento: KeyboardEvent) {
      if (evento.key === "Escape") setMenuAberto(false);
    }
    document.addEventListener("keydown", fecharEscape);
    return () => document.removeEventListener("keydown", fecharEscape);
  }, [menuAberto]);

  return (
    <>
      <header className={styles.cabecalhoGeral}>
        <div className={styles.barraAcessibilidade}>
          <div className={styles.container}>
            <div className={styles.acessibilidadeControles}>
              <button type="button" className={styles.acessibilidadeBotao} aria-label={altoContraste ? "Desativar alto contraste" : "Ativar alto contraste"} aria-pressed={altoContraste} onClick={() => setAltoContraste(v => !v)}>◐</button>
              <button type="button" className={styles.acessibilidadeBotao} aria-label="Aumentar fonte" onClick={() => setTamanhoFonte(v => Math.min(24, v + 2))}>A+</button>
              <button type="button" className={styles.acessibilidadeBotao} aria-label="Diminuir fonte" onClick={() => setTamanhoFonte(v => Math.max(12, v - 2))}>A-</button>
            </div>
          </div>
        </div>
        <div className={styles.cabecalho}>
          <div className={styles.container}>
            <div className={styles.gridCabecalho}>
              <Link href="/" className={styles.logoDepartamento} aria-label="Bem-Estar Animal, página inicial">
                <Image src={logoBemEstar} unoptimized width={173} height={82} alt="Logotipo de Bem-Estar Animal" className={styles.logo} />
              </Link>
              <div className={styles.buscaWrapper} role="search" aria-label="Pesquisa (em desenvolvimento)">
                <span className={styles.btnBuscar} aria-hidden="true">⌕</span>
                <input type="search" aria-label="Pesquisa indisponível nesta versão" placeholder="Busca por animais — em breve" disabled className={styles.inputBusca}/>
              </div>
              <div className={styles.prefeituraWrapper}>
                <Image src="/assets/logo_prefeituraVotorantim.png" width={120} height={80} alt="Logotipo da Prefeitura de Votorantim" className={styles.logoPrefeitura}/>
              </div>
            </div>
          </div>
        </div>
        <nav className={styles.navegacao} aria-label="Navegação principal">
          <div className={styles.container}>
            <div className={styles.flexNav}>
              <button type="button" className={styles.btnMenu} onClick={() => setMenuAberto(true)} aria-expanded={menuAberto} aria-controls="menu-lateral"><span aria-hidden="true">🐾</span>Menu</button>
              <div className={styles.barraNav}>
                <Link href="/">Início</Link>
                <Link href="/ocorrencias/nova?tipo=PERDIDO">Perdi meu Pet</Link>
                <Link href="/ocorrencias/nova?tipo=ENCONTRADO">Encontrei um Pet</Link>
                <Link href="/localizacao">Localização</Link>
                <span className={styles.emDesenvolvimento} title="Módulo ainda não integrado">Banco de Ração (em breve)</span>
              </div>
            </div>
          </div>
        </nav>
      </header>
      {menuAberto && (
        <div className={styles.menuOverlay}>
          <button type="button" className={styles.overlayFechar} aria-label="Fechar menu" onClick={() => setMenuAberto(false)} />
          <aside id="menu-lateral" role="dialog" aria-modal="true" aria-label="Menu de navegação" className={styles.menuLateral}>
            <div className={styles.menuTopo}>
              <strong>🐾 MENU</strong>
              <button type="button" aria-label="Fechar menu lateral" className={styles.fechar} onClick={() => setMenuAberto(false)}>×</button>
            </div>
            <div className={styles.menuCorpo}>
              <h2>NAVEGAÇÃO</h2>
              <Link href="/" onClick={() => setMenuAberto(false)}>Página Inicial</Link>
              <Link href="/ocorrencias/nova?tipo=PERDIDO" onClick={() => setMenuAberto(false)}>Perdi meu Pet</Link>
              <Link href="/ocorrencias/nova?tipo=ENCONTRADO" onClick={() => setMenuAberto(false)}>Encontrei um Pet</Link>
              <Link href="/localizacao" onClick={() => setMenuAberto(false)}>Mapa de localização</Link>
            </div>
          </aside>
        </div>
      )}
      {children}
      <footer className={styles.rodape}>
        <div className={styles.rodapeTopo}>
          <div className={styles.container}>
            <div className={styles.rodapeConteudo}>
              <div className={styles.rodapeTexto}>
                <strong>Resgate e Mapeamento de Animais</strong>
                <p>Projeto Integrador — FATEC Votorantim. Registro de animais perdidos e encontrados, com revisão administrativa e localização pública aproximada.</p>
                <p>Não publique dados de contato nem endereços residenciais nas ocorrências.</p>
              </div>
              <div className={styles.rodapeLogos}>
                <Image src={logoBemEstar} unoptimized width={110} height={90} alt="Bem-Estar Animal" className={styles.logo} />
                <Image src="/assets/logo_prefeituraVotorantim.png" width={100} height={65} alt="Prefeitura de Votorantim" className={styles.logoPrefeitura}/>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.rodapeBase}>
          <div className={styles.container}>Projeto acadêmico • Votorantim/SP</div>
        </div>
      </footer>
    </>
  );
}
