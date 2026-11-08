"use client";

import { useState, type FormEvent } from "react";
import styles from "./recuperar-senha.module.css";
import { solicitarApi } from "../../lib/frontend-api";
import AppIcon from "../../components/AppIcon";
import CustomButton from "../../components/CustomButton";

export default function RecuperarSenhaPage() {
  const [formData, setFormData] = useState({ nome: "", email: "" });
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setMensagem("");
    setErro("");
    setEnviando(true);
    try {
      const resultado = await solicitarApi<{ mensagem: string }>("/api/auth/recuperar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      setMensagem(resultado.mensagem);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Não foi possível solicitar a recuperação.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <h2 className={styles.titulo}>RECUPERAR SENHA <AppIcon name="pets" className="ui-icon" /></h2>
        {mensagem ? (
          <div role="status" style={{ textAlign: "center", padding: "20px" }}>
            <AppIcon name="checkCircle" className="ui-icon" style={{ fontSize: "3rem", color: "var(--cor-verde-agua)" }} />
            <p style={{ marginTop: "15px", fontWeight: "bold" }}>{mensagem}</p>
            <CustomButton href="/login" variant="red" style={{ marginTop: "20px" }}>VOLTAR PARA LOGIN</CustomButton>
          </div>
        ) : (
          <>
            <p className={styles.subtitulo}>Insira seus dados para continuar:</p>
            <form onSubmit={enviar}>
              <div className={styles["form-group"]}>
                <label htmlFor="nome">Nome Completo</label>
                <input id="nome" name="nome" required minLength={2} maxLength={100}
                  placeholder="Digite seu nome completo..." value={formData.nome}
                  onChange={(evento) => setFormData((anterior) => ({ ...anterior, nome: evento.target.value }))} />
              </div>
              <div className={styles["form-group"]}>
                <label htmlFor="email">E-mail</label>
                <input id="email" name="email" type="email" required maxLength={254}
                  placeholder="email@exemplo.com" value={formData.email}
                  onChange={(evento) => setFormData((anterior) => ({ ...anterior, email: evento.target.value }))} />
              </div>
              {erro && <p role="alert" className="text-danger">{erro}</p>}
              <CustomButton type="submit" disabled={enviando}>
                {enviando ? "ENVIANDO..." : "RECUPERAR SENHA"}
                <AppIcon name="arrowForward" className="ui-icon" />
              </CustomButton>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
