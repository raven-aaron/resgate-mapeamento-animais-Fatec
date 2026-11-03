"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function CadastroPage() {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    setSalvando(true);
    try {
      const resposta = await fetch("/api/auth/cadastro", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, email, senha }),
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro || "Erro no cadastro.");
      router.push("/resgate");
      router.refresh();
    } catch (e) { setErro(e instanceof Error ? e.message : "Erro ao criar conta."); }
    finally { setSalvando(false); }
  }
  return <main className="form-shell">
    <header className="form-heading"><h1>CRIAR CONTA</h1><p>Cadastro de cidadão. Contas criadas aqui não possuem permissões administrativas.</p></header>
    <form className="form-panel" onSubmit={enviar}>
      <div className="form-grid">
        <label className="form-field">Nome completo<input required minLength={2} maxLength={100} value={nome} autoComplete="name" onChange={e=>setNome(e.target.value)} /></label>
        <label className="form-field">E-mail<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} /></label>
        <label className="form-field">Senha<input type="password" required minLength={10} maxLength={128} autoComplete="new-password" value={senha} onChange={e=>setSenha(e.target.value)} /><small>Use pelo menos 10 caracteres.</small></label>
      </div>
      {erro && <p className="note note-warning" role="alert">{erro}</p>}
      <div className="action-row"><button type="submit" className="action action-primary" disabled={salvando}>{salvando?"Cadastrando...":"CRIAR CONTA"}</button><Link className="action action-secondary" href="/login">Já tenho conta</Link></div>
    </form>
  </main>;
}
