"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
type Aviso={id:number;tipo:string;texto:string;ocorrencia:number|null;conversa:number|null;data:string;lida:string|null};
export default function PainelNotificacoes(){
  const [avisos,setAvisos]=useState<Aviso[]>([]);
  const [erro,setErro]=useState("");
  const [carregando,setCarregando]=useState(true);
  const [salvando,setSalvando]=useState(false);
  const carregar=useCallback(async(signal?:AbortSignal)=>{
    const resposta=await fetch("/api/notificacoes",{cache:"no-store",signal});
    const dados=await resposta.json() as {notificacoes?:Aviso[];erro?:string};
    if(!resposta.ok)throw new Error(dados.erro||"Não foi possível carregar os avisos.");
    if(!signal?.aborted){setAvisos(dados.notificacoes||[]);setErro("");}
  },[]);
  useEffect(()=>{
    const controller=new AbortController();
    void Promise.resolve().then(()=>carregar(controller.signal)).catch(e=>{
      if(!controller.signal.aborted)setErro(e instanceof Error?e.message:"Falha na consulta.");
    }).finally(()=>{if(!controller.signal.aborted)setCarregando(false);});
    const intervalo=setInterval(()=>{if(document.visibilityState==="visible")void carregar(controller.signal).catch(()=>{});},15000);
    return ()=>{controller.abort();clearInterval(intervalo);};
  },[carregar]);
  async function marcar(id?:number){
    if(salvando)return;
    setSalvando(true);setErro("");
    try{
      const resposta=await fetch("/api/notificacoes",{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify(id?{id}:{todas:true})
      });
      if(!resposta.ok){const d=await resposta.json();throw new Error(d.erro||"Não foi possível marcar o aviso.");}
      await carregar();
      window.dispatchEvent(new Event("resgate-notificacoes"));
    }catch(e){setErro(e instanceof Error?e.message:"Falha ao marcar aviso.");}
    finally{setSalvando(false);}
  }
  return <main className="site-wrap pagina-notificacoes">
    <div className="form-heading"><span className="eyebrow">Sua conta</span><h1>NOTIFICAÇÕES</h1>
      <p>Mensagens recebidas e decisões sobre os animais cadastrados.</p></div>
    <div className="action-row">
      <Link className="action action-secondary" href="/mensagens">Ver conversas</Link>
      <button className="action action-primary" type="button" disabled={salvando||!avisos.some(a=>!a.lida)}
        onClick={()=>void marcar()}>MARCAR TODAS COMO LIDAS</button>
    </div>
    {carregando&&<p role="status">Carregando avisos...</p>}
    {erro&&<p role="alert" className="note note-warning">{erro}</p>}
    <div className="lista-avisos">
      {avisos.map(a=><article key={a.id} className={"aviso-item"+(!a.lida?" aviso-nao-lido":"")}>
        <div><strong>{a.tipo==="NOVA_MENSAGEM"?"Nova mensagem":
          a.tipo==="OCORRENCIA_APROVADA"?"Ocorrência aprovada":
          a.tipo==="OCORRENCIA_REJEITADA"?"Ocorrência rejeitada":"Atualização de ocorrência"}</strong>
          <p>{a.texto}</p><small>{String(a.data).replace("T"," ").slice(0,16)}</small>
        </div>
        <div className="aviso-acoes">
          <Link className="inline-action" href={a.conversa?"/mensagens/"+a.conversa:"/minhas-ocorrencias"}>ABRIR</Link>
          {!a.lida&&<button type="button" className="inline-action" disabled={salvando} onClick={()=>void marcar(a.id)}>MARCAR LIDA</button>}
        </div>
      </article>)}
    </div>
    {!carregando&&!erro&&avisos.length===0&&<p className="note">Você ainda não possui notificações.</p>}
  </main>;
}
