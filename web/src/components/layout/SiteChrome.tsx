"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import styles from "./SiteChrome.module.css";
import ContaNoCabecalho from "./ContaNoCabecalho";

const logoBemEstar = "https://raw.githubusercontent.com/raven-aaron/Projeto-Resgate-e-Mapeamento-FATEC/main/ProjetoNext/public/assets/logo_Bem-EstarAnimal_2.png";

const servicos = [
  { nome: "Vacinas", href: "/servicos/vacinas", termos: "vacina vacinacao imunizacao campanha" },
  { nome: "Adoção", href: "/servicos/adocao", termos: "adocao adotar adote" },
  { nome: "Banco de Ração", href: "/servicos/banco-de-racao", termos: "banco racao alimentar doacao" },
  { nome: "Perdi meu Pet", href: "/resgate", termos: "pet animal resgate animais perdido perdi encontrei achados" },
  { nome: "Registrar animal perdido", href: "/ocorrencias/nova?tipo=PERDIDO", termos: "cadastrar registrar desaparecido perda" },
  { nome: "Registrar animal encontrado", href: "/ocorrencias/nova?tipo=ENCONTRADO", termos: "encontrado encontrei achei rua cadastro" },
  { nome: "Mapa do resgate", href: "/mapa", termos: "mapa localizacao cep pontos" },
];

function normalizar(entrada: string) {
  return entrada.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

export default function SiteChrome({ children }: { children: ReactNode }) {
  const router = useRouter();
  const caminho=usePathname();
  const paginaAdministrativa=caminho.startsWith("/admin");
  const [menuAberto, setMenuAberto] = useState(false);
  const abrirMenuRef = useRef<HTMLButtonElement>(null);
  const fecharMenuRef = useRef<HTMLButtonElement>(null);
  const [altoContraste, setAltoContraste] = useState(false);
  const [tamanhoFonte, setTamanhoFonte] = useState(16);
  const [busca, setBusca] = useState("");
  const [resultadoBusca, setResultadoBusca] = useState("");

  useEffect(() => {
    document.body.classList.toggle("modo-alto-contraste", altoContraste);
    return () => document.body.classList.remove("modo-alto-contraste");
  }, [altoContraste]);

  useEffect(() => {
    document.documentElement.style.fontSize = tamanhoFonte + "px";
    return () => { document.documentElement.style.fontSize = ""; };
  }, [tamanhoFonte]);

  useEffect(() => {
    if (!menuAberto) return;
    fecharMenuRef.current?.focus();
    const botaoAbertura=abrirMenuRef.current;
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        evento.preventDefault();
        setMenuAberto(false);
      }
      if (evento.key === "Tab") {
        const painel=document.getElementById("menu-resgate");
        const focaveis=Array.from(painel?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])'
        )||[]);
        if(!focaveis.length)return;
        const primeiro=focaveis[0],ultimo=focaveis[focaveis.length-1];
        if(evento.shiftKey && document.activeElement===primeiro){
          evento.preventDefault();ultimo.focus();
        } else if(!evento.shiftKey && document.activeElement===ultimo){
          evento.preventDefault();primeiro.focus();
        }
      }
    }
    document.addEventListener("keydown", aoTeclar);
    return () => {
      document.removeEventListener("keydown", aoTeclar);
      botaoAbertura?.focus();
    };
  }, [menuAberto]);

  function pesquisar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const termo = normalizar(busca);
    if (!termo) {
      setResultadoBusca("Digite o nome de um serviço para pesquisar.");
      return;
    }
    const achado = servicos.find(servico => normalizar(servico.nome) === termo)
      ?? servicos.find(servico => normalizar(servico.nome).includes(termo) || servico.termos.split(" ").some(palavra => palavra.startsWith(termo)));
    if (!achado) {
      setResultadoBusca("Serviço não encontrado. Consulte Vacinas, Adoção, Banco de Ração ou Perdi meu Pet.");
      return;
    }
    setResultadoBusca("");
    setBusca("");
    router.push(achado.href);
  }

  return (
    <>
      <a className={styles.pularConteudo} href="#conteudo-principal">Pular para o conteúdo principal</a>
      <header className={styles.cabecalhoGeral}>
        <div className={styles.barraAcessibilidade}>
          <div className={styles.container}>
            <div className={styles.acessibilidadeControles}>
              <button type="button" className={styles.acessibilidadeBotao} aria-label={altoContraste ? "Desativar alto contraste" : "Ativar alto contraste"} aria-pressed={altoContraste} onClick={() => setAltoContraste(valor => !valor)}>◐</button>
              <button type="button" className={styles.acessibilidadeBotao} aria-label="Aumentar fonte" onClick={() => setTamanhoFonte(valor => Math.min(24, valor + 2))}>A+</button>
              <button type="button" className={styles.acessibilidadeBotao} aria-label="Diminuir fonte" onClick={() => setTamanhoFonte(valor => Math.max(12, valor - 2))}>A-</button>
            </div>
          </div>
        </div>
        <div className={styles.cabecalho}>
          <div className={styles.container}>
            <div className={styles.gridCabecalho}>
              <Link href="/" className={styles.logoDepartamento} aria-label="Bem-Estar Animal, página inicial">
                <Image src={logoBemEstar} unoptimized width={173} height={82} alt="Departamento de Proteção e Bem-Estar Animal" className={styles.logo}/>
              </Link>
              <form role="search" className={styles.buscaWrapper} onSubmit={pesquisar}>
                <button type="submit" className={styles.btnBuscar} aria-label="Pesquisar serviços">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" aria-hidden="true">
                    <circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>
                  </svg>
                </button>
                <div className={styles.campoBusca}>
                  <input type="search" value={busca} onChange={evento => { setBusca(evento.target.value); setResultadoBusca(""); }} aria-label="Pesquisar serviços" placeholder="O que você procura?" className={styles.inputBusca}/>
                  {resultadoBusca && <p className={styles.buscaFeedback} role="status">{resultadoBusca}</p>}
                </div>
              </form>
              <div className={styles.prefeituraWrapper}>
                <Image src="/assets/logo_prefeituraVotorantim.png" width={120} height={80} alt="Prefeitura Municipal de Votorantim" className={styles.logoPrefeitura}/>

              </div>
            </div>
          </div>
        </div>
        <div className={styles.navegacao}>
          <div className={styles.container}>
            <div className={styles.linhaNavegacao}>
              <nav className={styles.flexNav} aria-label="Serviços do município">
              <button ref={abrirMenuRef} type="button" className={styles.btnMenu} onClick={() => setMenuAberto(true)} aria-expanded={menuAberto} aria-controls="menu-resgate">
                <span aria-hidden="true">🐾</span><span>Menu</span>
              </button>
              <div className={styles.barraNav}>
                <Link href="/servicos/vacinas">Vacinas</Link>
                <Link href="/servicos/adocao">Adoção</Link>
                <Link href="/servicos/banco-de-racao">Banco de Ração</Link>
                <Link href="/resgate">Perdi meu Pet</Link>
              </div>
              </nav>
              {!paginaAdministrativa&&<div className={styles.contaTopo}><ContaNoCabecalho/></div>}
            </div>
          </div>
        </div>
      </header>
      {menuAberto && (
        <div className={styles.menuOverlay}>
          <button type="button" className={styles.overlayFechar} aria-label="Fechar menu de resgate" onClick={() => setMenuAberto(false)}/>
          <aside id="menu-resgate" role="dialog" aria-modal="true" aria-label="Menu do módulo de resgate" className={styles.menuLateral}>
            <div className={styles.menuTopo}>
              <strong>🐾 MENU DE RESGATE</strong>
              <button ref={fecharMenuRef} type="button" aria-label="Fechar menu lateral" className={styles.fechar} onClick={() => setMenuAberto(false)}>×</button>
            </div>
            <div className={styles.menuCorpo}>
              <h2>ANIMAIS PERDIDOS E ENCONTRADOS</h2>
              <Link href="/ocorrencias/nova?tipo=PERDIDO" onClick={() => setMenuAberto(false)}>Registrar animal perdido</Link>
              <Link href="/ocorrencias/nova?tipo=ENCONTRADO" onClick={() => setMenuAberto(false)}>Registrar animal encontrado</Link>
              <Link href="/mapa" onClick={() => setMenuAberto(false)}>Mapa de animais</Link>
              {!paginaAdministrativa&&<div className={styles.contaLateral}><ContaNoCabecalho compacto/></div>}
            </div>
          </aside>
        </div>
      )}
      <div id="conteudo-principal" tabIndex={-1}>{children}</div>
      <footer className={styles.rodape}>
        <div className={styles.rodapeTopo}>
          <div className={styles.container}>
            <div className={styles.rodapeConteudo}>
              <div className={styles.rodapeTexto}>
                <strong>Proteção e Bem-Estar Animal — Votorantim</strong>
                <p>Consulte animais perdidos e encontrados, divulgue ocorrências e ajude famílias a se reencontrarem com seus pets.</p>
                <p>Atendimento e contato entre usuários realizados pela própria plataforma.</p>
              </div>
              <div className={styles.rodapeLogos}>
                <Image src={logoBemEstar} unoptimized width={110} height={90} alt="Departamento de Bem-Estar Animal" className={styles.logo}/>
                <Image src="/assets/logo_prefeituraVotorantim.png" width={100} height={65} alt="Prefeitura de Votorantim" className={styles.logoPrefeitura}/>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.rodapeBase}>
          <div className={styles.container}>Proteção e Bem-Estar Animal • Votorantim/SP <Link href="/admin/login" className={styles.linkAdministracao}>Área administrativa</Link></div>
        </div>
      </footer>
    </>
  );
}
