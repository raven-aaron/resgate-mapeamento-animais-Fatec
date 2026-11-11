"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import CustomButton from "../CustomButton";
import styles from "./ContaNoCabecalho.module.css";

type Usuario={id:number;nome:string;email:string};
type Contagem={naoLidas:number;mensagensNaoLidas:number;ultimaMensagemNaoLida:number};
type Icone="usuario"|"mensagem"|"sino"|"sair"|"chevron"|"lista";

function Simbolo({tipo}:{tipo:Icone}){
  const caminhos:Record<Icone,React.ReactNode>={
    usuario:<><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></>,
    mensagem:<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5A9 9 0 1 1 21 11.5Z"/>,
    sino:<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></>,
    sair:<><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7"/></>,
    chevron:<path d="m6 9 6 6 6-6"/>,
    lista:<><rect x="6" y="4" width="14" height="17" rx="2"/><path d="M9 9h8M9 13h8M9 17h5M9 2h8"/></>,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{caminhos[tipo]}</svg>;
}

function formatarNumero(n:number){return n>99?"99+":String(n);}

export default function ContaNoCabecalho({compacto=false}:{compacto?:boolean}){
  const router=useRouter();
  const pathname=usePathname();
  const menuRef=useRef<HTMLDetailsElement>(null);
  const ultimoAviso=useRef<number|null>(null);
  const contaAnterior=useRef<number|null>(null);
  const [usuario,setUsuario]=useState<Usuario|null>(null);
  const [verificando,setVerificando]=useState(true);
  const [saindo,setSaindo]=useState(false);
  const [contagem,setContagem]=useState<Contagem>({naoLidas:0,mensagensNaoLidas:0,ultimaMensagemNaoLida:0});
  const [erro,setErro]=useState("");
  const [aviso,setAviso]=useState("");

  const consultarConta=useCallback(async()=>{
    try{
      const res=await fetch("/api/auth/me",{cache:"no-store",credentials:"same-origin"});
      const corpo=await res.json() as {usuario:Usuario|null};
      if(!res.ok)throw new Error("Falha ao verificar a sessão.");
      const id=corpo.usuario?.id??null;
      if(id!==contaAnterior.current){contaAnterior.current=id;ultimoAviso.current=null;setAviso("");}
      setUsuario(corpo.usuario);
      if(!id)setContagem({naoLidas:0,mensagensNaoLidas:0,ultimaMensagemNaoLida:0});
      setErro("");
    }catch{
      setErro("Não foi possível consultar sua conta.");
    }finally{
      setVerificando(false);
    }
  },[]);

  const consultarAvisos=useCallback(async()=>{
    if(compacto)return;
    try{
      const res=await fetch("/api/notificacoes",{cache:"no-store",credentials:"same-origin"});
      if(res.status===401){
        setContagem({naoLidas:0,mensagensNaoLidas:0,ultimaMensagemNaoLida:0});
        ultimoAviso.current=null;
        return;
      }
      if(!res.ok)return;
      const dados=await res.json() as Contagem;
      const ultima=Number(dados.ultimaMensagemNaoLida||0);
      const qtd=Number(dados.mensagensNaoLidas||0);
      if(ultimoAviso.current!==null && ultima>ultimoAviso.current && qtd>0){
        setAviso(qtd===1?"Você recebeu uma nova mensagem.":"Você tem novas mensagens.");
        if(typeof window.Notification!=="undefined" && window.Notification.permission==="granted"
          && (document.visibilityState!=="visible"||!document.hasFocus())){
          try{new window.Notification("Nova mensagem · Resgate de Animais",{body:"Veja suas conversas para ler."});}catch{}
        }
      }
      ultimoAviso.current=Math.max(ultimoAviso.current??0,ultima);
      setContagem({naoLidas:Number(dados.naoLidas||0),mensagensNaoLidas:qtd,ultimaMensagemNaoLida:ultima});
    }catch{/* Uma falha temporária no polling não bloqueia a navegação. */}
  },[compacto]);

  useEffect(()=>{
    void Promise.resolve().then(consultarConta);
    if(!compacto)void Promise.resolve().then(consultarAvisos);
    const aoMudar=()=>{ultimoAviso.current=null;void consultarConta();void consultarAvisos();};
    const aoVisivel=()=>{if(document.visibilityState==="visible"){void consultarConta();void consultarAvisos();}};
    window.addEventListener("resgate-auth",aoMudar);
    window.addEventListener("resgate-notificacoes",consultarAvisos);
    document.addEventListener("visibilitychange",aoVisivel);
    const id=window.setInterval(()=>{
      if(document.visibilityState==="visible")void consultarConta();
      void consultarAvisos();
    },10000);
    return ()=>{
      window.clearInterval(id);
      window.removeEventListener("resgate-auth",aoMudar);
      window.removeEventListener("resgate-notificacoes",consultarAvisos);
      document.removeEventListener("visibilitychange",aoVisivel);
    };
  },[consultarConta,consultarAvisos,compacto]);

  useEffect(()=>{
    if(!compacto)void Promise.resolve().then(consultarAvisos);
    menuRef.current?.removeAttribute("open");
  },[pathname,compacto,consultarAvisos]);

  useEffect(()=>{
    const node=menuRef.current;
    if(!node)return;
    function fecharFora(evento:PointerEvent){
      if(evento.target instanceof Node&&!node?.contains(evento.target))node?.removeAttribute("open");
    }
    function escapar(evento:KeyboardEvent){
      if(evento.key==="Escape"&&node?.open){node.removeAttribute("open");node.querySelector("summary")?.focus();}
    }
    document.addEventListener("pointerdown",fecharFora);
    document.addEventListener("keydown",escapar);
    return ()=>{document.removeEventListener("pointerdown",fecharFora);document.removeEventListener("keydown",escapar);};
  },[]);

  useEffect(()=>{
    if(!aviso)return;
    const id=window.setTimeout(()=>setAviso(""),6500);
    return ()=>window.clearTimeout(id);
  },[aviso]);

  async function sair(){
    if(saindo)return;
    setSaindo(true);setErro("");
    try{
      const res=await fetch("/api/auth/logout",{method:"POST",credentials:"same-origin"});
      if(!res.ok)throw new Error("Não foi possível sair da conta.");
      setUsuario(null);
      setContagem({naoLidas:0,mensagensNaoLidas:0,ultimaMensagemNaoLida:0});
      ultimoAviso.current=null;
      window.dispatchEvent(new Event("resgate-auth"));
      router.replace("/");
      router.refresh();
    }catch(e){setErro(e instanceof Error?e.message:"Falha ao sair.");}
    finally{setSaindo(false);}
  }

  if(verificando)return <div className={styles.area} role="status"><span className={styles.verificando}>Verificando conta…</span></div>;
  return <div className={styles.area+(compacto?" "+styles.compacta:"")}>
    {usuario ? <>
      <div className={styles.identidade} title={usuario.email}>
        <span className={styles.avatar}><Simbolo tipo="usuario"/></span>
        <span className={styles.saudacao}>Olá, <strong>{usuario.nome}</strong></span>
      </div>
      <details ref={menuRef} className={styles.contaMenu}>
        <summary><Simbolo tipo="usuario"/><span>Minha conta</span><Simbolo tipo="chevron"/></summary>
        <div className={styles.listaConta}>
          <Link href="/minha-conta" onClick={()=>menuRef.current?.removeAttribute("open")}>
            <Simbolo tipo="usuario"/>Dados da conta
          </Link>
          <Link href="/minhas-ocorrencias" onClick={()=>menuRef.current?.removeAttribute("open")}>
            <Simbolo tipo="lista"/>Minhas ocorrências
          </Link>
        </div>
      </details>
      <nav className={styles.avisos} aria-label="Mensagens e notificações do cidadão">
        <Link href="/mensagens" className={styles.iconeLink} title="Minhas conversas"
          aria-label={"Conversas: "+contagem.mensagensNaoLidas+" mensagens não lidas"}>
          <Simbolo tipo="mensagem"/>
          {contagem.mensagensNaoLidas>0&&<span className={styles.contador}>{formatarNumero(contagem.mensagensNaoLidas)}</span>}
          {compacto&&<span>Conversas</span>}
        </Link>
        <Link href="/notificacoes" className={styles.iconeLink} title="Minhas notificações"
          aria-label={"Notificações: "+contagem.naoLidas+" não lidas"}>
          <Simbolo tipo="sino"/>
          {contagem.naoLidas>0&&<span className={styles.contador}>{formatarNumero(contagem.naoLidas)}</span>}
          {compacto&&<span>Notificações</span>}
        </Link>
      </nav>
      <CustomButton className={styles.sair} variant="red" size="small" type="button" onClick={()=>void sair()} disabled={saindo}>
        <Simbolo tipo="sair"/>{saindo?"Saindo…":"Sair"}
      </CustomButton>
    </> : <nav className={styles.visitante} aria-label="Acesso do cidadão">
      <Link className={styles.entrar} href="/login">Entrar</Link>
      <Link className={styles.cadastrar} href="/cadastro">Criar conta</Link>
    </nav>}
    {aviso&&!compacto&&<div className={styles.toast} role="status">
      {aviso} <Link href="/mensagens">Abrir conversas</Link>
    </div>}
    {erro&&<p className={styles.erro} role="alert">{erro}</p>}
  </div>;
}
