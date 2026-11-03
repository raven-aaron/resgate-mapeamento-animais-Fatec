"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./Chat.module.css";
type Conversa={id:number;animal:string|null;especie:string;tipo:string;interlocutor:string;ultimaMensagem:string|null;ultimaData:string|null;situacao:string;ocorrencia:number};
export default function CaixaEntrada(){
  const [conversas,setConversas]=useState<Conversa[]>([]);
  const [erro,setErro]=useState("");
  const [carregando,setCarregando]=useState(true);
  useEffect(()=>{
    const ctrl=new AbortController();
    void fetch("/api/conversas",{signal:ctrl.signal,cache:"no-store"})
      .then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.erro||"Erro na consulta.");return data;})
      .then(data=>{if(!ctrl.signal.aborted)setConversas(data.conversas||[]);})
      .catch(e=>{if(!ctrl.signal.aborted)setErro(e instanceof Error?e.message:"Falha no chat.");})
      .finally(()=>{if(!ctrl.signal.aborted)setCarregando(false);});
    return ()=>ctrl.abort();
  },[]);
  return <main className={styles.pagina}>
    <div className="form-heading"><span className="eyebrow">Área do cidadão</span><h1>MINHAS CONVERSAS</h1><p>Mensagens privadas relacionadas aos cartazes de animais perdidos e encontrados.</p></div>
    {carregando&&<p>Carregando conversas...</p>}
    {erro&&<p className="note note-warning" role="alert">{erro}</p>}
    <div className={styles.lista}>
      {conversas.map(c=><Link href={"/mensagens/"+c.id} key={c.id} className={styles.item}>
        <span className={styles.icone}>🐾</span>
        <span><strong>{c.animal||c.especie} · {c.tipo==="PERDIDO"?"Perdido":"Encontrado"}</strong><small>Conversando com {c.interlocutor}</small><small>{c.ultimaMensagem||"Conversa iniciada. Envie uma mensagem para começar."}</small></span>
        <span className={styles.abrir}>Abrir →</span>
      </Link>)}
    </div>
    {!carregando&&!erro&&!conversas.length&&<p className="note">Não há conversas. Para iniciar uma, abra um cartaz público e clique em <strong>Entrar em contato pelo chat</strong>.</p>}
    <div className="action-row"><Link className="action action-secondary" href="/mapa">Ver animais no mapa</Link></div>
  </main>;
}
