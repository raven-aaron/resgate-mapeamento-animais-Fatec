"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./login.module.css";
import { solicitarApi } from "../../lib/frontend-api";
import AppIcon from "../../components/AppIcon";
import CustomButton from "../../components/CustomButton";

function LoginFormFinal() {
  const router = useRouter();
  const parametros = useSearchParams();
  const solicitado = parametros.get("retorno") || "/mapa";
  const retorno = solicitado.startsWith("/") && !solicitado.startsWith("//") && !solicitado.startsWith("/\\")
    ? solicitado
    : "/mapa";
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      await solicitarApi<{ ok: boolean }>("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha, manterConectado: true }),
      });
      const sessao = await solicitarApi<{ usuario: { id: number } | null }>("/api/auth/me");
      if (!sessao.usuario) throw new Error("Não foi possível confirmar a sessão.");
      window.dispatchEvent(new Event("resgate-auth"));
      router.replace(retorno);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.titulo}>LOGIN DE USUÁRIO <AppIcon name="pets" className="ui-icon" /></h2>
        <p className={styles.subtitulo}>Insira seus dados para continuar:</p>
        <form onSubmit={enviar}>
          <div className={styles["form-group"]}>
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" autoComplete="username" required maxLength={254}
              placeholder="email@exemplo.com" value={email} onChange={(evento) => setEmail(evento.target.value)} />
          </div>
          <div className={styles["form-group"]}>
            <label htmlFor="senha">Senha</label>
            <input id="senha" name="senha" type="password" autoComplete="current-password" required
              placeholder="Digite sua senha" value={senha} onChange={(evento) => setSenha(evento.target.value)} />
          </div>
          {erro && <p role="alert" className="text-danger">{erro}</p>}
          <CustomButton type="submit" disabled={enviando}>
            {enviando ? "ENTRANDO..." : "ENTRAR"}
            <AppIcon name="arrowForward" className="ui-icon" />
          </CustomButton>
        </form>
        <Link href="/recuperar-senha" className={styles["link-esqueci"]}>ESQUECI MINHA SENHA</Link>
        <p className="mt-3">Não tem conta? <Link href={`/registro-usuario?retorno=${encodeURIComponent(retorno)}`}>Cadastre-se</Link></p>
        <p><Link href="/admin/login">Acesso administrativo</Link></p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return <Suspense fallback={<main className={styles.container}><p>Carregando...</p></main>}><LoginFormFinal /></Suspense>;
}
