"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";

export default function LoginForm({ admin = false }: { admin?: boolean }) {
  const router = useRouter();
  const params = useSearchParams();
  const solicitado = params.get("retorno") || "";
  const retorno = solicitado.startsWith("/") && !solicitado.startsWith("//") && !solicitado.startsWith("/\\") && !solicitado.startsWith("/admin") ? solicitado : "/resgate";
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [manterConectado, setManterConectado] = useState(true);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setCarregando(true);
    setErro("");
    try {
      const resposta = await fetch("/api/auth/login", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha, admin, manterConectado }),
      });
      const resultado = await resposta.json();
      if (!resposta.ok) throw new Error(resultado.erro || "Falha ao entrar.");
      // Confirma que o navegador recebeu o cookie antes de acessar páginas protegidas.
      const sessao = await fetch(admin?"/api/auth/admin/me":"/api/auth/me", { cache: "no-store", credentials: "same-origin" });
      const atual = await sessao.json() as { usuario?: { id: number } | null };
      if (!sessao.ok || !atual.usuario) throw new Error("Não foi possível confirmar a sessão. Confira se os cookies estão habilitados.");
      window.dispatchEvent(new Event("resgate-auth"));
      router.replace(admin ? "/admin" : retorno);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally { setCarregando(false); }
  }
  return (
    <main className="form-shell">
      <header className="form-heading">
        <span className="eyebrow">{admin ? "Acesso restrito • Prefeitura" : "Área do cidadão"}</span>
        <h1>{admin ? "ACESSO ADMINISTRATIVO" : "ENTRAR"}</h1>
        <p>{admin ? "Somente servidores com permissão administrativa no módulo Resgate." : "Entre para cadastrar e acompanhar suas ocorrências."}</p>
      </header>
      <form className="form-panel" onSubmit={enviar}>
        <div className="form-grid">
          <label className="form-field">E-mail<input type="email" required autoComplete="username" maxLength={254} value={email} onChange={e => setEmail(e.target.value)}/></label>
          <label className="form-field">Senha<input type="password" required autoComplete="current-password" value={senha} onChange={e => setSenha(e.target.value)}/></label>
        </div>
        {admin?<p className="note">Somente administradores autorizados. Esta sessão administrativa é temporária e independente da conta do cidadão.</p>:<>
          <label className="form-field login-persistencia"><input type="checkbox" checked={manterConectado} onChange={e=>setManterConectado(e.target.checked)} /> Manter minha conta conectada por 30 dias neste dispositivo</label>
          <small className="login-persistencia-aviso">Em computadores compartilhados, deixe desmarcado e saia ao terminar.</small>
        </>}
        {erro && <p role="alert" className="note note-warning" style={{marginTop:18}}>{erro}</p>}
        <div className="action-row">
          <button className="action action-primary" type="submit" disabled={carregando}>{carregando ? "Autenticando..." : "ENTRAR"}</button>
          <Link href={admin?"/":"/resgate"} className="action action-secondary">Voltar</Link>
        </div>
        {!admin && <p style={{marginTop:22}}>Ainda não possui conta? <Link href={"/cadastro?retorno="+encodeURIComponent(retorno)} style={{color:"var(--cor-verde-agua)",fontWeight:700}}>Cadastre-se</Link> · <Link href="/recuperar-senha" style={{color:"var(--cor-verde-agua)",fontWeight:700}}>Esqueci minha senha</Link></p>}
      </form>
    </main>
  );
}
