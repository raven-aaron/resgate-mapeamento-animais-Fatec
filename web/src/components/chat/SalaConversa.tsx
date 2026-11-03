"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import styles from "./Chat.module.css";
type Mensagem={id:number;conteudo:string;data:string;remetente:number;autor:string};
type Conversa={id:number;ocorrencia:number;animal:string|null;tipo:string;interlocutor:string;situacao:string;podeEnviar:boolean};
type Dados={conversa:Conversa;mensagens:Mensagem[];meuId:number};
export default function SalaConversa({id}:{id:number}){
  const [dados,setDados]=useState<Dados|null>(null);
  const [texto,setTexto]=useState("");
  const [erro,setErro]=useState("");
  const [enviando,setEnviando]=useState(false);
  const buscar=useCallback(async(signal?:AbortSignal)=>{
    const resposta=await fetch("/api/conversas/"+id+"/mensagens",{signal,cache:"no-store"});
    const corpo=await resposta.json() as Dados & {erro?:string};
    if(!resposta.ok)throw new Error(corpo.erro||"Erro na conversa.");
    if(!signal?.aborted)setDados(corpo);
  },[id]);
  useEffect(()=>{
    const controlador=new AbortController();
    async function sincronizar(){
      try{await buscar(controlador.signal);if(!controlador.signal.aborted)setErro("");}
      catch(e){if(!controlador.signal.aborted)setErro(e instanceof Error?e.message:"Falha ao carregar");}
    }
    void sincronizar();
    const intervalo=setInterval(()=>{void sincronizar();},5000);
    return ()=>{clearInterval(intervalo);controlador.abort();};
  },[buscar]);
  async function enviar(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!texto.trim()||enviando)return;
    setEnviando(true);setErro("");
    try{
      const resposta=await fetch("/api/conversas/"+id+"/mensagens",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({conteudo:texto})});
      const corpo=await resposta.json();
      if(!resposta.ok)throw new Error(corpo.erro||"Falha ao enviar mensagem.");
      setTexto("");
      await buscar();
    }catch(e){setErro(e instanceof Error?e.message:"Falha no envio.");}
    finally{setEnviando(false);}
  }
  return <main className={styles.pagina}>
    <div className="form-heading"><Link href="/mensagens">← Minhas conversas</Link><h1>CHAT DO RESGATE</h1></div>
    {erro&&<p role="alert" className="note note-warning">{erro}</p>}
    {!dados&&!erro&&<p>Carregando conversa...</p>}
    {dados&&<section className={styles.sala}>
      <header className={styles.cabecalho}>
        <strong>{dados.conversa.animal||"Animal"} • {dados.conversa.tipo==="PERDIDO"?"Perdido":"Encontrado"}</strong>
        <p>Conversa com {dados.conversa.interlocutor} · <Link href={"/ocorrencias/"+dados.conversa.ocorrencia}>Ver cartaz</Link></p>
      </header>
      <div className={styles.mensagens} aria-live="polite" aria-label="Histórico de mensagens">
        {dados.mensagens.map(m=><div key={m.id} className={m.remetente===dados.meuId?styles.minha:styles.outra}>
          <strong>{m.remetente===dados.meuId?"Você":m.autor}</strong>
          <p>{m.conteudo}</p>
          <small>{String(m.data).replace("T"," ").slice(0,16)}</small>
        </div>)}
        {!dados.mensagens.length&&<p className={styles.inicio}>Envie uma mensagem para começar a conversa sobre o pet.</p>}
      </div>
      {dados.conversa.podeEnviar?<form className={styles.compor} onSubmit={enviar}>
        <label htmlFor="mensagem-texto">Mensagem</label>
        <textarea id="mensagem-texto" required maxLength={2000} rows={3} value={texto} onChange={e=>setTexto(e.target.value)} placeholder="Escreva sua mensagem ao responsável..." />
        <button type="submit" disabled={enviando||!texto.trim()} className="action action-primary">{enviando?"Enviando...":"ENVIAR MENSAGEM"}</button>
      </form>:<p className="note note-warning">Esta conversa está encerrada ou a publicação não está mais ativa. O histórico permanece disponível aos participantes.</p>}
    </section>}
  </main>;
}
