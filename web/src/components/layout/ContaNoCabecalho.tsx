"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./ContaNoCabecalho.module.css";

type Usuario={id:number;nome:string;email:string;adminResgate:boolean};
type Contagem={naoLidas:number;mensagensNaoLidas:number;ultimaMensagemNaoLida?:number};
export default function ContaNoCabecalho({compacto=false}:{compacto?:boolean}){
  const router=useRouter();
  const caminho=usePathname();
  const [usuario,setUsuario]=useState<Usuario|null>(null);
  const [carregando,setCarregando]=useState(true);
  const [saindo,setSaindo]=useState(false);
  const [contagem,setContagem]=useState<Contagem>({naoLidas:0,mensagensNaoLidas:0});
  const [erro,setErro]=useState("");
  const [aviso,setAviso]=useState("");
  const anterior=useRef<number|null>(null);
  const contaAnterior=useRef<number|null>(null);
  const consultarConta=useCallback(async()=>{
    try{
      const resposta=await fetch("/api/auth/me",{cache:"no-store",credentials:"same-origin"});
      const dados=await resposta.json() as {usuario:Usuario|null};
      if(!resposta.ok)throw new Error("Não foi possível verificar a conta.");
      setUsuario(dados.usuario);
      if(contaAnterior.current !== (dados.usuario?.id ?? null)){
        contaAnterior.current=dados.usuario?.id ?? null;
        anterior.current=null;
      }
      if(!dados.usuario){setContagem({naoLidas:0,mensagensNaoLidas:0});anterior.current=null;}
      setErro("");
    }catch{
      setErro("Não foi possível verificar a sessão.");
    }finally{setCarregando(false);}
  },[]);
  const consultarAvisos=useCallback(async()=>{
    try{
      const resposta=await fetch("/api/notificacoes",{cache:"no-store",credentials:"same-origin"});
      if(resposta.status===401){setContagem({naoLidas:0,mensagensNaoLidas:0});anterior.current=null;return;}
      if(!resposta.ok)return;
      const dados=await resposta.json() as Contagem;
      const numero=Number(dados.mensagensNaoLidas||0);
      const ultimoId=Number(dados.ultimaMensagemNaoLida||0);
      // IDs crescentes detectam novas mensagens mesmo quando a contagem não muda.
      if(anterior.current!==null&&ultimoId>anterior.current&&numero>0){
        setAviso(numero===1?"Você recebeu uma nova mensagem.":"Você tem novas mensagens.");
        if(typeof window.Notification!=="undefined" && window.Notification.permission==="granted" &&
          (document.visibilityState!=="visible" || !document.hasFocus())){
          try{new window.Notification("Nova mensagem · Resgate de Animais",{body:"Acesse suas conversas para ler a mensagem."});}catch{}
        }
      }
      anterior.current=Math.max(anterior.current??0,ultimoId);
      setContagem({naoLidas:Number(dados.naoLidas||0),mensagensNaoLidas:numero});
    }catch{/* A interface continua funcional mesmo com falha pontual na consulta. */}
  },[]);
  useEffect(()=>{
    void Promise.resolve().then(consultarConta);
    const aoAlterar=()=>{anterior.current=null;void consultarConta();if(!compacto)void consultarAvisos();};
    const aoVisivel=()=>{if(document.visibilityState==="visible"){void consultarConta();if(!compacto)void consultarAvisos();}};
    window.addEventListener("resgate-auth",aoAlterar);
    if(!compacto)window.addEventListener("resgate-notificacoes",consultarAvisos);
    document.addEventListener("visibilitychange",aoVisivel);
    const intervalo=setInterval(()=>{
      if(document.visibilityState==="visible")void consultarConta();
      // Um aviso pode chegar mesmo com a aba em segundo plano (enquanto aberta).
      if(!compacto)void consultarAvisos();
    },10000);
    return ()=>{
      clearInterval(intervalo);
      window.removeEventListener("resgate-auth",aoAlterar);
      window.removeEventListener("resgate-notificacoes",consultarAvisos);
      document.removeEventListener("visibilitychange",aoVisivel);
    };
  },[compacto,consultarConta,consultarAvisos]);
  useEffect(()=>{
    void Promise.resolve().then(consultarConta);
    if(!compacto)void Promise.resolve().then(consultarAvisos);
  },[caminho,compacto,consultarConta,consultarAvisos]);
  useEffect(()=>{
    if(!aviso)return;
    const id=setTimeout(()=>setAviso(""),6500);
    return ()=>clearTimeout(id);
  },[aviso]);
  async function sair(){
    if(saindo)return;
    setSaindo(true);setErro("");
    try{
      const resposta=await fetch("/api/auth/logout",{method:"POST",credentials:"same-origin"});
      if(!resposta.ok)throw new Error("Não foi possível sair da conta.");
      setUsuario(null);setContagem({naoLidas:0,mensagensNaoLidas:0});anterior.current=null;
      window.dispatchEvent(new Event("resgate-auth"));
      router.replace("/");
      router.refresh();
    }catch(e){setErro(e instanceof Error?e.message:"Erro ao sair.");}
    finally{setSaindo(false);}
  }
  if(carregando)return <nav className={styles.area} aria-label="Sua conta"><span className={styles.nome}>Verificando sua conta...</span></nav>;
  return <nav className={styles.area+(compacto?" "+styles.compacta:"")} aria-label="Sua conta e mensagens">
    {usuario?<><span className={styles.nome} title={usuario.email}>Olá, {usuario.nome.split(" ")[0]}</span>
      <Link className={styles.link} href="/minha-conta">Minha conta</Link>
      <Link className={styles.link} href="/minhas-ocorrencias">Minhas ocorrências</Link>
      <Link className={styles.link} href="/mensagens">Conversas {contagem.mensagensNaoLidas>0&&
        <span className={styles.contador} aria-label={contagem.mensagensNaoLidas+" mensagens não lidas"}>{contagem.mensagensNaoLidas>99?"99+":contagem.mensagensNaoLidas}</span>}</Link>
      <Link className={styles.link} href="/notificacoes">Notificações {contagem.naoLidas>0&&
        <span className={styles.contador} aria-label={contagem.naoLidas+" notificações não lidas"}>{contagem.naoLidas>99?"99+":contagem.naoLidas}</span>}</Link>
      {usuario.adminResgate&&<Link className={styles.link} href="/admin">Administração</Link>}
      <button type="button" className={styles.sair} disabled={saindo} onClick={()=>void sair()}>{saindo?"Saindo...":"Sair da conta"}</button>
    </>:<>
      <span className={styles.nome}>Você não está conectado</span>
      <Link className={styles.entrar} href="/login">Entrar na minha conta</Link>
      <Link className={styles.link} href="/cadastro">Criar conta</Link>
    </>}
    {aviso&&<div className={styles.toast} role="status">{aviso} <Link href="/mensagens">Abrir conversas</Link></div>}
    {erro&&<span role="alert" className={styles.erro}>{erro}</span>}
  </nav>;
}
