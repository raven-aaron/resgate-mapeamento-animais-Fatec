import Image from "next/image";
import CustomButton from "../CustomButton";
import { identificacaoAnimal } from "../../lib/identificacao-animal";
import type { Ocorrencia } from "../../lib/tipos";
import styles from "./CartaoOcorrenciaAdmin.module.css";

type Props = {
  ocorrencia: Ocorrencia;
  aoAprovar?: () => void;
  aoRejeitar?: () => void;
  aoOcultar?: () => void;
};

function dataExibida(valor: string) {
  const data = String(valor).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(data) ? data.split("-").reverse().join("/") : "Não informada";
}

export default function CartaoOcorrenciaAdmin({
  ocorrencia,
  aoAprovar,
  aoRejeitar,
  aoOcultar,
}: Props) {
  const perdido = ocorrencia.tipo === "PERDIDO";
  const nome = identificacaoAnimal(ocorrencia.tipo, ocorrencia.nome, ocorrencia.especie);

  return (
    <article className={styles.cartao}>
      <div className={styles.foto}>
        <Image
          src={ocorrencia.foto || "/assets/cachorrogatoinicial.jpg"}
          alt={`Foto de ${nome}`}
          fill
          sizes="(max-width: 720px) 100vw, 50vw"
          unoptimized={Boolean(ocorrencia.foto?.startsWith("/api/"))}
        />
      </div>
      <div className={styles.conteudo}>
        <strong className={`${styles.tipo} ${perdido ? styles.perdido : styles.encontrado}`}>
          {perdido ? "PROCURA-SE" : "ENCONTRADO"}
        </strong>
        <h2 className={styles.nome}>{nome}</h2>
        <p className={styles.detalhe}>Espécie: {ocorrencia.especie}</p>
        <p className={styles.detalhe}>Bairro: {ocorrencia.bairro || "Não informado"}</p>
        <p className={styles.detalhe}>Data: {dataExibida(ocorrencia.data)}</p>
        <p className={styles.detalhe}>
          Moderação: {ocorrencia.status_aprovacao === "PENDENTE"
            ? "Em análise"
            : ocorrencia.status_aprovacao === "APROVADO"
              ? "Aprovada"
              : ocorrencia.status_aprovacao === "REJEITADO"
                ? "Rejeitada"
                : "Oculta"}
        </p>
        <div className={styles.acoes}>
          <CustomButton href={`/admin/ocorrencias/${ocorrencia.id}`} fullWidth>
            SAIBA MAIS
          </CustomButton>
          {aoAprovar && <CustomButton variant="green" onClick={aoAprovar} fullWidth>ACEITAR</CustomButton>}
          {aoRejeitar && <CustomButton variant="red" onClick={aoRejeitar} fullWidth>NEGAR</CustomButton>}
          {aoOcultar && <CustomButton variant="red" onClick={aoOcultar} fullWidth>OCULTAR</CustomButton>}
        </div>
      </div>
    </article>
  );
}
