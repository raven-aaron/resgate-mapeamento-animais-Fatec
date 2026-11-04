"use client";
import Link from "next/link";
import { Suspense,useState,type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

function Formulario(){
  const token=useSearchParams().get("token")||"";
  const [senha,setSenha]=useState("");
  const [confirmacao,setConfirmacao]=useState("");
  const [erro,setErro]=useState("");
  const [sucesso,setSucesso]=useState("");
  const [enviando,setEnviando]=useState(false);
  async function enviar(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setErro("");
    if(senha!==confirmacao){setErro("As senhas não coincidem.");return;}
    setEnviando(true);
    try{
      const resposta=await fetch("/api/auth/redefinir",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,senha})});
      const dados=await resposta.json();
      if(!resposta.ok)throw new Error(dados.erro||"Falha ao redefinir senha.");
      setSucesso(dados.mensagem);
    }catch(e){setErro(e instanceof Error?e.message:"Falha ao redefinir.");}
    finally{setEnviando(false);}
  }
  return <main className="form-shell">
    <header className="form-heading"><h1>REDEFINIR SENHA</h1></header>
    <form className="form-panel" onSubmit={enviar}>
      {!/^[a-f0-9]{64}$/.test(token)&&<p className="note note-warning">Link de recuperação inválido.</p>}
      {sucesso?<p className="note" role="status">{sucesso} <Link href="/login">Entrar</Link></p>:<>
        <div className="form-grid">
          <label className="form-field">Nova senha<input type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={senha} onChange={e=>setSenha(e.target.value)} /></label>
          <label className="form-field">Confirmar senha<input type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={confirmacao} onChange={e=>setConfirmacao(e.target.value)} /></label>
        </div>
        {erro&&<p className="note note-warning" role="alert">{erro}</p>}
        <div className="action-row"><button className="action action-primary" type="submit" disabled={enviando||!/^[a-f0-9]{64}$/.test(token)}>{enviando?"Salvando...":"SALVAR NOVA SENHA"}</button></div>
      </>}
    </form>
  </main>;
}
export default function RedefinirSenha(){return <Suspense fallback={<main className="form-shell">Carregando...</main>}><Formulario/></Suspense>;}
