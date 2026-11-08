"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import type { Ocorrencia } from "../../lib/tipos";
import AppIcon from "../AppIcon";
import CustomButton from "../CustomButton";
import CartaoOcorrenciaAdmin from "./CartaoOcorrenciaAdmin";
import styles from "./GerenciarOcorrencias.module.css";

type Acao = "APROVAR" | "REJEITAR" | "OCULTAR";
const motivosOcultacao = [
  "Encontrado pelo tutor",
  "Adotado por nova família",
  "Falecimento do animal",
  "Erro ou duplicidade no cadastro",
] as const;

type Filtros = {
  especie: string;
  situacao: string;
  ordem: string;
  busca: string;
  situacaoCadastro: string;
};

const filtrosIniciais: Filtros = {
  especie: "",
  situacao: "",
  ordem: "RECENTE",
  busca: "",
  situacaoCadastro: "",
};

function normalizar(valor: string) {
  return valor.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
}

export default function GerenciarOcorrencias({ status }: { status: "PENDENTE" | "TODAS" }) {
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");
  const [confirmacao, setConfirmacao] = useState<{ id: number; acao: Acao } | null>(null);
  const [motivo, setMotivo] = useState("");
  const [motivoOcultacao, setMotivoOcultacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [filtroAberto, setFiltroAberto] = useState(false);
  const [filtros, setFiltros] = useState<Filtros>(filtrosIniciais);
  const [filtrosTemporarios, setFiltrosTemporarios] = useState<Filtros>(filtrosIniciais);
  const modalRef = useRef<HTMLElement>(null);
  const aguardando = useRef(false);

  const carregar = useCallback(async (signal?: AbortSignal) => {
    const resposta = await fetch("/api/admin/ocorrencias?status=" + status, { cache: "no-store", signal });
    const dados = await resposta.json() as { ocorrencias?: Ocorrencia[]; erro?: string };
    if (!resposta.ok) throw new Error(dados.erro || "Falha ao carregar solicitações.");
    if (!signal?.aborted) setOcorrencias(dados.ocorrencias || []);
  }, [status]);

  useEffect(() => {
    const controlador = new AbortController();
    void Promise.resolve().then(() => carregar(controlador.signal)).catch((error: unknown) => {
      if (!controlador.signal.aborted) setErro(error instanceof Error ? error.message : "Erro de consulta.");
    }).finally(() => {
      if (!controlador.signal.aborted) setCarregando(false);
    });
    const intervalo = setInterval(() => {
      void carregar(controlador.signal).catch(() => undefined);
    }, 7000);
    return () => {
      clearInterval(intervalo);
      controlador.abort();
    };
  }, [carregar]);

  useEffect(() => {
    aguardando.current = enviando;
  }, [enviando]);

  useEffect(() => {
    if (!confirmacao && !filtroAberto) return;
    const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const modal = modalRef.current;
    const focaveis = () => Array.from(modal?.querySelectorAll<HTMLElement>(
      'button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),a[href]'
    ) || []);
    focaveis()[0]?.focus();

    function tratarTeclado(evento: KeyboardEvent) {
      if (evento.key === "Escape" && !aguardando.current) {
        evento.preventDefault();
        if (confirmacao) {
          setConfirmacao(null);
          setMotivo("");
        } else {
          setFiltroAberto(false);
        }
        return;
      }
      if (evento.key !== "Tab") return;
      const itens = focaveis();
      if (!itens.length) return;
      const primeiro = itens[0];
      const ultimo = itens[itens.length - 1];
      if (evento.shiftKey && document.activeElement === primeiro) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    }

    document.addEventListener("keydown", tratarTeclado);
    return () => {
      document.removeEventListener("keydown", tratarTeclado);
      focoAnterior?.focus();
    };
  }, [confirmacao, filtroAberto]);

  const ocorrenciasFiltradas = useMemo(() => {
    const termo = normalizar(filtros.busca.trim());
    return ocorrencias.filter((ocorrencia) => {
      const atendeBusca = !termo || normalizar([
        ocorrencia.tipo === "PERDIDO" ? ocorrencia.nome || "" : "",
        ocorrencia.bairro || "",
        ocorrencia.especie,
      ].join(" ")).includes(termo);
      return (!filtros.especie || ocorrencia.especie === filtros.especie)
        && (!filtros.situacao || ocorrencia.tipo === filtros.situacao)
        && (!filtros.situacaoCadastro || ocorrencia.status_aprovacao === filtros.situacaoCadastro)
        && atendeBusca;
    }).sort((a, b) => filtros.ordem === "RECENTE" ? b.id - a.id : a.id - b.id);
  }, [ocorrencias, filtros]);

  async function confirmar() {
    if (!confirmacao) return;
    const motivoDecisao = confirmacao.acao === "OCULTAR" ? motivoOcultacao : motivo;
    if (confirmacao.acao !== "APROVAR" && !motivoDecisao) return;
    setEnviando(true);
    setErro("");
    setSucesso("");
    try {
      const resposta = await fetch("/api/admin/ocorrencias", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: confirmacao.id, acao: confirmacao.acao, motivo: motivoDecisao }),
      });
      const dados = await resposta.json() as { erro?: string; status?: string };
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível alterar a ocorrência.");
      setSucesso("Situação da ocorrência nº " + confirmacao.id + " atualizada com sucesso.");
      setConfirmacao(null);
      setMotivo("");
      setMotivoOcultacao("");
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha de moderação.");
    } finally {
      setEnviando(false);
    }
  }

  function aplicarFiltros(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setFiltros(filtrosTemporarios);
    setFiltroAberto(false);
  }

  const tituloFiltro = status === "PENDENTE" ? "FILTRO DE SOLICITAÇÕES" : "FILTRO DE ANIMAIS";

  return <div>
    <div className={styles.topoLista}>
      <CustomButton type="button" size="small" variant="green" onClick={() => {
        void carregar().catch((error: unknown) => setErro(error instanceof Error ? error.message : "Falha ao atualizar."));
      }}>ATUALIZAR LISTA</CustomButton>
      <CustomButton type="button" size="small" variant="gray" className={styles.botaoFiltro}
        aria-haspopup="dialog" aria-expanded={filtroAberto}
        onClick={() => {
          setFiltrosTemporarios(filtros);
          setFiltroAberto(true);
        }}>
        <AppIcon name="filter" className="ui-icon" /> Filtros
      </CustomButton>
    </div>
    {carregando && <p role="status">Carregando {status === "PENDENTE" ? "solicitações" : "registros"}...</p>}
    {erro && <p role="alert" className="note note-warning">{erro}</p>}
    {sucesso && <p role="status" className="note">{sucesso}</p>}
    <p><strong>{ocorrenciasFiltradas.length} ocorrência(s)</strong> na consulta atual.</p>
    <div className={styles.gridCartoes}>
      {ocorrenciasFiltradas.map((ocorrencia) => <CartaoOcorrenciaAdmin
        key={ocorrencia.id}
        ocorrencia={ocorrencia}
        aoAprovar={ocorrencia.status_aprovacao === "PENDENTE"
          ? () => setConfirmacao({ id: ocorrencia.id, acao: "APROVAR" })
          : undefined}
        aoRejeitar={ocorrencia.status_aprovacao === "PENDENTE"
          ? () => setConfirmacao({ id: ocorrencia.id, acao: "REJEITAR" })
          : undefined}
        aoOcultar={ocorrencia.status_aprovacao === "APROVADO"
          ? () => setConfirmacao({ id: ocorrencia.id, acao: "OCULTAR" })
          : undefined}
      />)}
      {!carregando && ocorrenciasFiltradas.length === 0 && <p className="note">
        {ocorrencias.length === 0
          ? `Não há ${status === "PENDENTE" ? "solicitações pendentes" : "registros"} nesta situação.`
          : "Nenhuma ocorrência corresponde aos filtros selecionados."}
      </p>}
    </div>

    {filtroAberto && <div className="admin-modal-fundo" role="presentation" onMouseDown={(evento) => {
      if (evento.target === evento.currentTarget) setFiltroAberto(false);
    }}>
      <section ref={modalRef} className={`admin-modal ${styles.modalFiltros}`} role="dialog" aria-modal="true" aria-labelledby="titulo-filtros-admin">
        <h2 id="titulo-filtros-admin">{tituloFiltro}</h2>
        <form onSubmit={aplicarFiltros}>
          <div className={styles.camposFiltro}>
            <label className="form-field">Buscar animal ou bairro
              <input type="search" value={filtrosTemporarios.busca} placeholder="Nome, bairro ou espécie"
                onChange={(evento) => setFiltrosTemporarios((atuais) => ({ ...atuais, busca: evento.target.value }))} />
            </label>
            <label className="form-field">Aprovação
              <select value={filtrosTemporarios.situacaoCadastro}
                onChange={(evento) => setFiltrosTemporarios((atuais) => ({ ...atuais, situacaoCadastro: evento.target.value }))}>
                <option value="">Todas</option>
                <option value="PENDENTE">Em análise</option>
                <option value="APROVADO">Aprovada</option>
                <option value="REJEITADO">Rejeitada</option>
                <option value="OCULTO">Oculta</option>
              </select>
            </label>
            <label className="form-field">Espécie
              <select value={filtrosTemporarios.especie}
                onChange={(evento) => setFiltrosTemporarios((atuais) => ({ ...atuais, especie: evento.target.value }))}>
                <option value="">Todas</option>
                <option value="Cachorro">Cachorro</option>
                <option value="Gato">Gato</option>
              </select>
            </label>
            <label className="form-field">Tipo de ocorrência
              <select value={filtrosTemporarios.situacao}
                onChange={(evento) => setFiltrosTemporarios((atuais) => ({ ...atuais, situacao: evento.target.value }))}>
                <option value="">Todos</option>
                <option value="PERDIDO">Perdido</option>
                <option value="ENCONTRADO">Encontrado</option>
              </select>
            </label>
            <label className="form-field">Ordenar
              <select value={filtrosTemporarios.ordem}
                onChange={(evento) => setFiltrosTemporarios((atuais) => ({ ...atuais, ordem: evento.target.value }))}>
                <option value="RECENTE">Mais recente</option>
                <option value="ANTIGO">Mais antiga</option>
              </select>
            </label>
          </div>
          <div className={styles.acoesFiltro}>
            <CustomButton type="submit" fullWidth>APLICAR FILTROS</CustomButton>
            <CustomButton type="button" variant="gray" fullWidth onClick={() => {
              setFiltros(filtrosIniciais);
              setFiltrosTemporarios(filtrosIniciais);
              setFiltroAberto(false);
            }}>LIMPAR FILTROS</CustomButton>
          </div>
        </form>
      </section>
    </div>}

    {confirmacao && <div className="admin-modal-fundo" role="presentation">
      <section ref={modalRef} className="admin-modal" role="dialog" aria-modal="true" aria-label="Confirmar moderação">
        <h2>CONFIRMAR {confirmacao.acao === "APROVAR" ? "APROVAÇÃO" : confirmacao.acao === "REJEITAR" ? "REJEIÇÃO" : "OCULTAÇÃO"}</h2>
        <p>Ocorrência #{confirmacao.id}</p>
        {confirmacao.acao === "REJEITAR" && <label className="form-field">Motivo da rejeição
          <textarea required minLength={5} maxLength={500} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} placeholder="Descreva o motivo da rejeição." />
        </label>}
        {confirmacao.acao === "OCULTAR" && <label className="form-field">Motivo da ocultação
          <select required value={motivoOcultacao} onChange={(evento) => setMotivoOcultacao(evento.target.value)}>
            <option value="">Selecione o motivo...</option>
            {motivosOcultacao.map((opcao) => <option key={opcao} value={opcao}>{opcao}</option>)}
          </select>
        </label>}
        <div className="action-row">
          <CustomButton type="button" variant={confirmacao.acao === "APROVAR" ? "green" : "red"} disabled={enviando || (confirmacao.acao === "REJEITAR" && motivo.trim().length < 5) || (confirmacao.acao === "OCULTAR" && !motivoOcultacao)} onClick={() => void confirmar()}>{enviando ? "Salvando..." : "CONFIRMAR"}</CustomButton>
          <CustomButton type="button" variant="red" disabled={enviando} onClick={() => { setConfirmacao(null); setMotivo(""); setMotivoOcultacao(""); }}>CANCELAR</CustomButton>
        </div>
      </section>
    </div>}
  </div>;
}
