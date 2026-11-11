"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./IdentificacaoConectada.module.css";

type Usuario = { id: number; nome: string };
type Identidade = { nome: string; href: string };

export default function IdentificacaoConectada() {
  const [identidade, setIdentidade] = useState<Identidade | null>(null);
  const [erro, setErro] = useState("");
  const consultaAtual = useRef(0);

  const consultar = useCallback(async (signal?: AbortSignal) => {
    const idConsulta = ++consultaAtual.current;
    try {
      const respostaCidadao = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "same-origin",
        signal,
      });
      if (!respostaCidadao.ok) throw new Error("Não foi possível verificar a sessão.");
      const dadosCidadao = await respostaCidadao.json() as { usuario: Usuario | null };
      if (dadosCidadao.usuario) {
        if (idConsulta !== consultaAtual.current) return;
        setIdentidade({ nome: dadosCidadao.usuario.nome, href: "/minha-conta" });
        setErro("");
        return;
      }

      const respostaAdmin = await fetch("/api/auth/admin/me", {
        cache: "no-store",
        credentials: "same-origin",
        signal,
      });
      if (!respostaAdmin.ok) throw new Error("Não foi possível verificar a sessão administrativa.");
      const dadosAdmin = await respostaAdmin.json() as { usuario: Usuario | null };
      if (idConsulta !== consultaAtual.current) return;
      setIdentidade(dadosAdmin.usuario ? { nome: dadosAdmin.usuario.nome, href: "/admin" } : null);
      setErro("");
    } catch (error) {
      if (signal?.aborted || idConsulta !== consultaAtual.current) return;
      setErro(error instanceof Error ? error.message : "Não foi possível verificar a sessão.");
    }
  }, []);

  useEffect(() => {
    const controlador = new AbortController();
    void Promise.resolve().then(() => consultar(controlador.signal));
    const aoMudar = () => {
      consultaAtual.current += 1;
      setIdentidade(null);
      setErro("");
      void consultar();
    };
    window.addEventListener("resgate-auth", aoMudar);
    return () => {
      controlador.abort();
      consultaAtual.current += 1;
      window.removeEventListener("resgate-auth", aoMudar);
    };
  }, [consultar]);

  return (
    <div className={styles.faixa} role={erro ? "status" : undefined}>
      <div className={styles.conteudo}>
        {erro
          ? erro
          : identidade
            ? <>Conectado com: <Link href={identidade.href}>{identidade.nome}</Link></>
            : <>Sem usuário conectado. <Link href="/entrar">Entrar</Link></>}
      </div>
    </div>
  );
}
