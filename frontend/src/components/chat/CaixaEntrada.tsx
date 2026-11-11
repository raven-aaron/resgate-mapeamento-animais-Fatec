"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import CustomButton from "../CustomButton";
import styles from "./Chat.module.css";
type Conversa={id:number;animal:string|null;especie:string;tipo:string;interlocutor:string;ultimaMensagem:string|null;ultimaData:string|null;situacao:string;ocorrencia:number;naoLidas:number};
export default function CaixaEntrada(){
  const [conversas,setConversas]=useState<Conversa[]>([]);
  const [erro,setErro]=useState("");
  const [carregando,setCarregando]=useState(true);
  const [somenteNaoLidas,setSomenteNaoLidas]=useState(false);
  const [permissao,setPermissao]=useState<NotificationPermission|"indisponivel">("default");
  useEffect(()=>{
    void Promise.resolve().then(()=>{
      if(typeof window.Notification!=="undefined")setPermissao(window.Notification.permission);
    });
    const ctrl=new AbortController();
    async function atualizar(){
      try {
        const resposta=await fetch("/api/conversas",{signal:ctrl.signal,cache:"no-store"});
        const data=await resposta.json();
        if(!resposta.ok)throw new Error(data.erro||"Erro na consulta.");
        if(!ctrl.signal.aborted){setConversas(data.conversas||[]);setErro("");}
      }catch(e){
        if(!ctrl.signal.aborted)setErro(e instanceof Error?e.message:"Falha no chat.");
      }finally{if(!ctrl.signal.aborted)setCarregando(false);}
    }
    void atualizar();
    const intervalo=setInterval(()=>{if(document.visibilityState==="visible")void atualizar();},7000);
    return ()=>{clearInterval(intervalo);ctrl.abort();};
  },[]);
  async function ativarAvisos(){
    if(typeof window.Notification==="undefined"){setPermissao("indisponivel");return;}
    try{setPermissao(await window.Notification.requestPermission());}
    catch{setPermissao("indisponivel");}
  }
  return <main className={styles.pagina}>
    <div className="form-heading">
      <Link href="/minha-conta" className={styles.linkPerfil}>← Meu perfil</Link>
      <span className="eyebrow">Área do usuário</span>
      <h1>MINHAS CONVERSAS</h1>
    </div>
    <div className="action-row" style={{marginBottom:20}}>
      <CustomButton href="/minha-conta" variant="gray">VOLTAR AO PERFIL</CustomButton>
      <CustomButton type="button" variant="gray" onClick={()=>void ativarAvisos()}>
        {permissao==="granted"?"AVISOS DO NAVEGADOR ATIVADOS":"ATIVAR AVISOS DO NAVEGADOR"}
      </CustomButton>
      <CustomButton href="/notificacoes" variant="gray">NOTIFICAÇÕES</CustomButton>
    </div>
    <div className="action-row" style={{marginBottom:12}}>
      <CustomButton type="button" variant="gray" aria-pressed={!somenteNaoLidas}
        onClick={()=>setSomenteNaoLidas(false)}>Todas as conversas</CustomButton>
      <CustomButton type="button" variant="gray" aria-pressed={somenteNaoLidas}
        onClick={()=>setSomenteNaoLidas(true)}>Não lidas ({conversas.filter(c=>Number(c.naoLidas)>0).length})</CustomButton>
    </div>
    {permissao==="denied"&&<p className="note note-warning">O navegador bloqueou notificações. Altere a permissão nas configurações do site.</p>}
    {permissao==="indisponivel"&&<p className="note note-warning">Seu navegador não oferece avisos do sistema neste ambiente.</p>}
    {carregando&&<p>Carregando conversas...</p>}
    {erro&&<p className="note note-warning" role="alert">{erro}</p>}
    <div className={styles.lista}>
      {conversas.filter(c=>!somenteNaoLidas||Number(c.naoLidas)>0).map(c=><Link href={"/mensagens/"+c.id} key={c.id} className={styles.item}>
        <span className={styles.icone}>🐾</span>
        <span><strong>{c.animal||c.especie} · {c.tipo==="PERDIDO"?"Perdido":"Encontrado"}</strong><small>Conversando com {c.interlocutor}</small><small>{c.ultimaMensagem||"Nenhuma mensagem."}</small></span>
        <span className={styles.abrir}>{Number(c.naoLidas)>0?<span className={styles.naoLidas} aria-label={c.naoLidas+" mensagens não lidas"}>{c.naoLidas}</span>:""} Abrir →</span>
      </Link>)}
    </div>
    {!carregando&&!erro&&!conversas.length&&<p className="note">Nenhuma conversa ainda.</p>}
    {!carregando&&!erro&&somenteNaoLidas&&conversas.length>0&&!conversas.some(c=>Number(c.naoLidas)>0)&&
      <p className="note">Nenhuma mensagem não lida.</p>}
    <div className="action-row"><CustomButton href="/mapa" variant="gray">Ver animais no mapa</CustomButton></div>
  </main>;
}
