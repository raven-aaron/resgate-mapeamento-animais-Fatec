"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
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
    return ()=>controlador.abort();
  },[carregar]);

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
      setSucesso("Ocorrência #"+confirmacao.id+" atualizada para "+dados.status+".");
      setConfirmacao(null);
      setMotivo("");
      await carregar();
    }catch(error){setErro(error instanceof Error?error.message:"Falha de moderação.");}
    finally{setEnviando(false);}
  }

  return <div>
    <p>As ações abaixo alteram o banco de dados. Aprovações tornam a ocorrência visível na consulta pública.</p>
    {carregando && <p role="status">Carregando solicitações...</p>}
    {erro && <p role="alert" className="note note-warning">{erro}</p>}
    {sucesso && <p role="status" className="note">{sucesso}</p>}
    <p><strong>{ocorrencias.length} ocorrência(s)</strong> na consulta atual.</p>
    <div className="admin-cards">
      {ocorrencias.map(o=><article className="admin-cartao" key={o.id}>
        {o.foto?<Image unoptimized src={o.foto} alt={"Foto do pet "+o.id} width={180} height={180}/>:<div className="admin-sem-foto">🐾</div>}
        <div className="admin-info">
          <strong className={o.tipo==="PERDIDO"?"status-perdido":"status-encontrado"}>{o.tipo==="PERDIDO"?"PROCURA-SE":"ENCONTRADO"}</strong>
          <h3>{o.nome || o.especie} <small>#{o.id}</small></h3>
          <p>{o.especie} • {o.bairro} • {String(o.data).slice(0,10).split("-").reverse().join("/")}</p>
          <p><strong>Estado:</strong> {o.status_aprovacao} / {o.status_caso}</p>
          {o.descricao && <p><strong>Observações:</strong> {o.descricao}</p>}
          {o.referencia && <p><strong>Referência:</strong> {o.referencia}</p>}
          <div className="action-row">
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
      <section className="admin-modal" role="dialog" aria-modal="true" aria-label="Confirmar moderação">
        <h2>CONFIRMAR {confirmacao.acao==="APROVAR"?"APROVAÇÃO":confirmacao.acao==="REJEITAR"?"REJEIÇÃO":"OCULTAÇÃO"}</h2>
        <p>Ocorrência #{confirmacao.id}. A ação será salva no MySQL e registrada no histórico.</p>
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
