"use client";
import Link from "next/link";
import { useState,type FormEvent } from "react";

export default function RecuperarSenha(){
  const [nome,setNome]=useState("");
  const [email,setEmail]=useState("");
  const [erro,setErro]=useState("");
  const [sucesso,setSucesso]=useState("");
  const [enviando,setEnviando]=useState(false);
  async function enviar(e:FormEvent<HTMLFormElement>){
    e.preventDefault();setEnviando(true);setErro("");setSucesso("");
    try{
      const resposta=await fetch("/api/auth/recuperar",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({nome,email})});
      const dados=await resposta.json();
      if(!resposta.ok)throw new Error(dados.erro||"Erro ao solicitar redefinição.");
      setSucesso(dados.mensagem);
    }catch(e){setErro(e instanceof Error?e.message:"Falha de recuperação.");}
    finally{setEnviando(false);}
  }
  return <main className="form-shell">
    <header className="form-heading"><h1>RECUPERAR SENHA</h1><p>Informe o nome e o e-mail usados no cadastro. Se a recuperação por e-mail estiver configurada, receberá um link válido por 30 minutos.</p></header>
    <form className="form-panel" onSubmit={enviar}>
      <div className="form-grid">
        <label className="form-field">Nome completo<input required maxLength={100} minLength={2} value={nome} onChange={e=>setNome(e.target.value)}/></label>
        <label className="form-field">E-mail<input type="email" required maxLength={254} value={email} onChange={e=>setEmail(e.target.value)}/></label>
      </div>
      {erro&&<p className="note note-warning" role="alert">{erro}</p>}
      {sucesso&&<p className="note" role="status">{sucesso}</p>}
      <div className="action-row"><button className="action action-primary" type="submit" disabled={enviando}>{enviando?"Enviando...":"SOLICITAR LINK"}</button><Link className="action action-secondary" href="/login">Voltar ao login</Link></div>
    </form>
  </main>;
}
