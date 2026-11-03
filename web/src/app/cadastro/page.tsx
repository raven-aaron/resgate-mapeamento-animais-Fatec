"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";

function CadastroFormulario() {
  const router = useRouter();
  const params=useSearchParams();
  const pedido=params.get("retorno") || "";
  const retorno=pedido.startsWith("/")&&!pedido.startsWith("//")&&!pedido.startsWith("/\\")&&!pedido.startsWith("/admin")?pedido:"/resgate";
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone,setTelefone] = useState("");
  const [confirmacao,setConfirmacao] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    if (senha !== confirmacao) { setErro("As senhas informadas não coincidem."); return; }
    setSalvando(true);
    try {
      const resposta = await fetch("/api/auth/cadastro", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, telefone, senha }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Erro no cadastro.");
      router.push(retorno);
      router.refresh();
    } catch (e) { setErro(e instanceof Error ? e.message : "Erro ao criar conta."); }
    finally { setSalvando(false); }
  }
  return <main className="form-shell">
    <header className="form-heading"><h1>CRIAR CONTA</h1><p>Cadastro de cidadão. Contas criadas aqui não possuem permissões administrativas.</p></header>
    <form className="form-panel" onSubmit={enviar}>
      <div className="form-grid">
        <label className="form-field">Nome completo<input required minLength={2} maxLength={100} value={nome} autoComplete="name" onChange={e=>setNome(e.target.value)} /></label>
        <label className="form-field">Telefone com DDD<input type="tel" required inputMode="tel" minLength={10} maxLength={20} autoComplete="tel" placeholder="(15) 99999-9999" value={telefone} onChange={e=>setTelefone(e.target.value)} /><small>Uso privado da conta. O número não será divulgado no cartaz.</small></label>
        <label className="form-field">E-mail<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>
        <label className="form-field">Senha<input type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={senha} onChange={e=>setSenha(e.target.value)} /><small>Use pelo menos 10 caracteres.</small></label>
        <label className="form-field">Confirmar senha<input type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={confirmacao} onChange={e=>setConfirmacao(e.target.value)}/></label>
      </div>
      {erro && <p className="note note-warning" role="alert">{erro}</p>}
      <div className="action-row"><button type="submit" className="action action-primary" disabled={salvando}>{salvando?"Cadastrando...":"CRIAR CONTA"}</button><Link className="action action-secondary" href={"/login?retorno="+encodeURIComponent(retorno)}>Já tenho conta</Link></div>
    </form>
  </main>;
}

export default function CadastroPage(){return <Suspense fallback={<main className="form-shell"><p>Carregando cadastro...</p></main>}><CadastroFormulario/></Suspense>;}
