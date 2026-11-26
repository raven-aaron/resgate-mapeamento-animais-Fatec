import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./CardAdminResumo.module.css";

type Variante = "acesso" | "indicador";

type CardProps = {
  variante: Variante;
  titulo: string | number;
  descricao?: string;
  icone?: ReactNode;
  href?: string;
};

export default function CardAdmin({
  variante,
  titulo,
  descricao,
  icone,
  href,
}: CardProps) {
  const classe = `${styles.card} ${styles[variante]}`;

  const conteudo = (
    <>
      {icone && (
        <span className={styles.icone} aria-hidden="true">
          {icone}
        </span>
      )}
      <strong className={styles.titulo}>{titulo}</strong>
      {descricao && <span className={styles.descricao}>{descricao}</span>}
    </>
  );

  return href ? (
    <Link href={href} className={classe}>
      {conteudo}
    </Link>
  ) : (
    <div className={classe}>{conteudo}</div>
  );
}

export function SecaoCards({
  titulo,
  variante,
  children,
}: {
  titulo: string;
  variante: Variante;
  children: ReactNode;
}) {
  return (
    <section>
      <h2 className={styles.secaoTitulo}>{titulo}</h2>
      <div
        className={`${styles.grade} ${variante === "indicador" ? styles.gradeIndicador : ""}`}
      >
        {children}
      </div>
    </section>
  );
}
