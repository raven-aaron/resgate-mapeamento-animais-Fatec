"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./registro.module.css";
import { solicitarApi } from "../../lib/frontend-api";
import AppIcon from "../../components/AppIcon";
import CustomButton from "../../components/CustomButton";

function RegistroUsuarioForm() {
  const router = useRouter();
  const parametros = useSearchParams();
  const solicitado = parametros.get("retorno") || "/mapa";
  const retorno = solicitado.startsWith("/") && !solicitado.startsWith("//") && !solicitado.startsWith("/\\")
    ? solicitado
    : "/mapa";
  const [formData, setFormData] = useState({ nome: "", telefone: "", email: "", senha: "", confirmarSenha: "" });
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  function alterar(evento: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = evento.target;
    setFormData((anterior) => ({ ...anterior, [name]: value }));
  }

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    if (formData.senha !== formData.confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }
    if (formData.senha.length < 10) {
      setErro("A senha deve ter pelo menos 10 caracteres.");
      return;
    }
    setEnviando(true);
    try {
      await solicitarApi<{ ok: boolean }>("/api/auth/cadastro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: formData.nome,
          telefone: formData.telefone,
          email: formData.email,
          senha: formData.senha,
        }),
      });
      window.dispatchEvent(new Event("resgate-auth"));
      router.replace(retorno);
      router.refresh();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível concluir o cadastro.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.titulo}>REGISTRO DE USUÁRIO <AppIcon name="pets" className="ui-icon" /></h2>
        <p className={styles.subtitulo}>Insira seus dados para continuar:</p>
        <p className={styles["links-auxiliares"]}>
          <Link href={`/login?retorno=${encodeURIComponent(retorno)}`} className={styles["link-principal"]}>Já tenho uma conta</Link>
        </p>
        <form onSubmit={enviar}>
          <div className={styles["form-group"]}>
            <label htmlFor="nome">Nome Completo</label>
            <input id="nome" name="nome" autoComplete="name" required maxLength={100}
              placeholder="Digite seu nome completo" value={formData.nome} onChange={alterar} />
          </div>
          <div className={styles["form-group"]}>
            <label htmlFor="telefone">Número de telefone</label>
            <input id="telefone" name="telefone" type="tel" autoComplete="tel" required
              placeholder="(XX) XXXXX-XXXX" value={formData.telefone} onChange={alterar} />
          </div>
          <div className={styles["form-group"]}>
            <label htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" autoComplete="email" required maxLength={254}
              placeholder="email@exemplo.com" value={formData.email} onChange={alterar} />
          </div>
          <div className={styles["form-group"]}>
            <label htmlFor="senha">Senha (mínimo 10 caracteres)</label>
            <input id="senha" name="senha" type="password" autoComplete="new-password" required minLength={10} maxLength={128}
              value={formData.senha} onChange={alterar} />
          </div>
          <div className={styles["form-group"]}>
            <label htmlFor="confirmarSenha">Confirmar Senha</label>
            <input id="confirmarSenha" name="confirmarSenha" type="password" autoComplete="new-password" required
              value={formData.confirmarSenha} onChange={alterar} />
          </div>
          {erro && <p role="alert" className="text-danger">{erro}</p>}
          <CustomButton type="submit" disabled={enviando}>
            {enviando ? "REGISTRANDO..." : "REGISTRAR"}
            <AppIcon name="arrowForward" className="ui-icon" />
          </CustomButton>
        </form>
        <div className={styles["links-auxiliares"]}>
          <Link href="/recuperar-senha" className={styles["link-secundario"]}>Esqueci minha senha</Link>
        </div>
      </div>
    </main>
  );
}

export default function RegistroUsuarioPage() {
  return <Suspense fallback={<main className={styles.container}><p>Carregando cadastro...</p></main>}><RegistroUsuarioForm /></Suspense>;
}
