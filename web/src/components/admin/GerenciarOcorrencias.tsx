"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Ocorrencia } from "../../lib/tipos";

type Acao = "APROVAR" | "REJEITAR" | "OCULTAR";
export default function GerenciarOcorrencias({ status }: { status: "PENDENTE" | "TODAS" }) {
  const [ocorrencias,setOcorrencias] = useState<Ocorrencia[]>([]);
  const [carregando,setCarregando] = useState(true);
  const [erro,setErro] = useState("");
  const [sucesso,setSucesso] = useState("");
  const [confirmacao,setConfirmacao] = useState<{ id: number; acao: Acao } | null>(null);
  const [motivo,setMotivo] = useState("");
  const [enviando,setEnviando] = useState(false);
  const modalRef=useRef<HTMLElement>(null);
  const aguardando=useRef(false);
  const [especie,setEspecie]=useState("");
  const [situacao,setSituacao]=useState("");
  const [ordem,setOrdem]=useState("RECENTE");
  const [busca,setBusca]=useState("");
  const [situacaoCadastro,setSituacaoCadastro]=useState("");

  const carregar = useCallback(async (signal?:AbortSignal) => {
    const resposta = await fetch("/api/admin/ocorrencias?status="+status, {cache:"no-store",signal});
    const dados = await resposta.json() as { ocorrencias?: Ocorrencia[]; erro?: string };
    if(!resposta.ok)throw new Error(dados.erro || "Falha ao carregar solicitações.");
    if(!signal?.aborted)setOcorrencias(dados.ocorrencias || []);
  },[status]);
  useEffect(()=>{
    const controlador=new AbortController();
    void Promise.resolve().then(()=>carregar(controlador.signal)).catch(error=>{if(!controlador.signal.aborted)setErro(error instanceof Error?error.message:"Erro de consulta");})
      .finally(()=>{if(!controlador.signal.aborted)setCarregando(false);});
    const intervalo=setInterval(()=>{void carregar(controlador.signal).catch(()=>undefined);},7000);
    return ()=>{clearInterval(intervalo);controlador.abort();};
  },[carregar]);

  useEffect(()=>{aguardando.current=enviando;},[enviando]);
  useEffect(()=>{
    if(!confirmacao)return;
    const focoAnterior=document.activeElement instanceof HTMLElement?document.activeElement:null;
    const modal=modalRef.current;
    const focaveis=()=>Array.from(modal?.querySelectorAll<HTMLElement>(
      'button:not([disabled]),textarea:not([disabled]),input:not([disabled]),a[href]'
    )||[]);
    focaveis()[0]?.focus();
    function tratarTeclado(evento:KeyboardEvent){
      if(evento.key==="Escape"&&!aguardando.current){
        evento.preventDefault();setConfirmacao(null);setMotivo("");return;
      }
      if(evento.key!=="Tab")return;
      const itens=focaveis();if(!itens.length)return;
      const primeiro=itens[0],ultimo=itens[itens.length-1];
      if(evento.shiftKey&&document.activeElement===primeiro){evento.preventDefault();ultimo.focus();}
      else if(!evento.shiftKey&&document.activeElement===ultimo){evento.preventDefault();primeiro.focus();}
    }
    document.addEventListener("keydown",tratarTeclado);
    return ()=>{document.removeEventListener("keydown",tratarTeclado);focoAnterior?.focus();};
  },[confirmacao]);

  async function confirmar() {
    if(!confirmacao)return;
    setEnviando(true);
    setErro("");
    setSucesso("");
    try {
      const resposta=await fetch("/api/admin/ocorrencias",{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ id:confirmacao.id,acao:confirmacao.acao,motivo }),
      });
      const dados=await resposta.json() as { erro?:string; status?:string };
      if(!resposta.ok)throw new Error(dados.erro || "Não foi possível alterar a ocorrência.");
      setSucesso("Situação da ocorrência nº "+confirmacao.id+" atualizada com sucesso.");
      setConfirmacao(null);
      setMotivo("");
      await carregar();
    }catch(error){setErro(error instanceof Error?error.message:"Falha de moderação.");}
    finally{setEnviando(false);}
  }

  return <div>
    <button type="button" className="inline-action" onClick={()=>{void carregar().catch(e=>setErro(e instanceof Error?e.message:"Falha ao atualizar."));}}>ATUALIZAR SOLICITAÇÕES</button>
    {carregando && <p role="status">Carregando solicitações...</p>}
    {erro && <p role="alert" className="note note-warning">{erro}</p>}
    {sucesso && <p role="status" className="note">{sucesso}</p>}
    <div className="filtros-admin">
      <label className="form-field">Buscar animal ou bairro<input type="search" value={busca} onChange={e=>setBusca(e.target.value)} placeholder="Nome, bairro ou espécie"/></label>
      <label className="form-field">Aprovação<select value={situacaoCadastro} onChange={e=>setSituacaoCadastro(e.target.value)}><option value="">Todas</option><option value="PENDENTE">Em análise</option><option value="APROVADO">Aprovada</option><option value="REJEITADO">Rejeitada</option><option value="OCULTO">Oculta</option></select></label>
      <label className="form-field">Espécie<select value={especie} onChange={e=>setEspecie(e.target.value)}><option value="">Todas</option><option value="Cachorro">Cachorro</option><option value="Gato">Gato</option></select></label>
      <label className="form-field">Situação<select value={situacao} onChange={e=>setSituacao(e.target.value)}><option value="">Todas</option><option value="PERDIDO">Perdido</option><option value="ENCONTRADO">Encontrado</option></select></label>
      <label className="form-field">Ordenar<select value={ordem} onChange={e=>setOrdem(e.target.value)}><option value="RECENTE">Mais recente</option><option value="ANTIGO">Mais antiga</option></select></label>
    </div>
    <p><strong>{ocorrencias.filter(o=>(!especie||o.especie===especie)&&(!situacao||o.tipo===situacao)&&(!situacaoCadastro||o.status_aprovacao===situacaoCadastro)&&(!busca||[o.nome,o.bairro,o.especie].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().includes(busca.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()))).length} ocorrência(s)</strong> na consulta atual.</p>
    <div className="admin-cards">
      {ocorrencias.filter(o=>(!especie||o.especie===especie)&&(!situacao||o.tipo===situacao)&&(!situacaoCadastro||o.status_aprovacao===situacaoCadastro)&&(!busca||[o.nome,o.bairro,o.especie].join(" ").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().includes(busca.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()))).sort((a,b)=>ordem==="RECENTE"?b.id-a.id:a.id-b.id).map(o=><article className="admin-cartao" key={o.id}>
        {o.foto?<Image unoptimized src={o.foto} alt={"Foto do pet "+o.id} width={180} height={180}/>:<div className="admin-sem-foto">🐾</div>}
        <div className="admin-info">
          <strong className={o.tipo==="PERDIDO"?"status-perdido":"status-encontrado"}>{o.tipo==="PERDIDO"?"PROCURA-SE":"ENCONTRADO"}</strong>
          <h3>{o.nome || o.especie} <small>#{o.id}</small></h3>
          <p>{o.especie} • {o.bairro} • {String(o.data).slice(0,10).split("-").reverse().join("/")}</p>
          <p><strong>Situação:</strong> {o.status_aprovacao === "PENDENTE" ? "Em análise" : o.status_aprovacao === "APROVADO" ? "Aprovado" : o.status_aprovacao === "REJEITADO" ? "Não aprovado" : "Oculto"} · {o.status_caso === "ABERTO" ? "Ativo" : "Encerrado"}</p>
          {o.descricao && <p><strong>Observações:</strong> {o.descricao}</p>}
          {o.referencia && <p><strong>Referência:</strong> {o.referencia}</p>}
          <div className="action-row">
            <Link className="action action-primary" href={"/admin/ocorrencias/"+o.id}>SAIBA MAIS · VER CARTAZ</Link>
            {o.status_aprovacao==="PENDENTE" && <>
              <button type="button" className="action action-primary" onClick={()=>setConfirmacao({id:o.id,acao:"APROVAR"})}>ACEITAR</button>
              <button type="button" className="action action-secondary" onClick={()=>setConfirmacao({id:o.id,acao:"REJEITAR"})}>NEGAR</button>
            </>}
            {o.status_aprovacao==="APROVADO" && <button type="button" className="action action-secondary" onClick={()=>setConfirmacao({id:o.id,acao:"OCULTAR"})}>OCULTAR</button>}
            {o.status_aprovacao==="APROVADO" && <Link className="inline-action" style={{marginTop:0}} href={"/ocorrencias/"+o.id}>Ver publicação</Link>}
          </div>
        </div>
      </article>)}
      {!carregando && ocorrencias.length===0 && <p className="note">Não há solicitações nesta situação.</p>}
    </div>
    {confirmacao && <div className="admin-modal-fundo" role="presentation">
      <section ref={modalRef} className="admin-modal" role="dialog" aria-modal="true" aria-label="Confirmar moderação">
        <h2>CONFIRMAR {confirmacao.acao==="APROVAR"?"APROVAÇÃO":confirmacao.acao==="REJEITAR"?"REJEIÇÃO":"OCULTAÇÃO"}</h2>
        <p>Ocorrência #{confirmacao.id}</p>
        {confirmacao.acao!=="APROVAR" && <label className="form-field">Motivo
          <textarea required minLength={5} maxLength={500} value={motivo} onChange={e=>setMotivo(e.target.value)} placeholder="Descreva o motivo da decisão." />
        </label>}
        <div className="action-row">
          <button type="button" className="action action-primary" disabled={enviando || (confirmacao.acao!=="APROVAR"&&motivo.trim().length<5)} onClick={()=>void confirmar()}>{enviando?"Salvando...":"CONFIRMAR"}</button>
          <button type="button" className="action action-secondary" disabled={enviando} onClick={()=>{setConfirmacao(null);setMotivo("");}}>CANCELAR</button>
        </div>
      </section>
    </div>}
  </div>;
}
