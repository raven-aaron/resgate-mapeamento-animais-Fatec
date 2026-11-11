import Image from 'next/image';
import CustomButton from './CustomButton';
import type { Ocorrencia } from '../lib/tipos';
import { identificacaoAnimal } from '../lib/identificacao-animal';
import styles from '../app/mapa/mapa.module.css';

export function CartaoPetMapa({
  pet,
  posicaoTop,
  posicaoLeft,
}: {
  pet: Ocorrencia;
  posicaoTop: string;
  posicaoLeft: string;
}) {
  const isPerdido = pet.tipo === "PERDIDO";
  const identificacao = identificacaoAnimal(pet.tipo, pet.nome, pet.especie);

  return (
    <div
      className={styles['pin-card']}
      style={{ top: posicaoTop, left: posicaoLeft }}
    >
      <div className={styles['card-mapa-interno']}>
        <h5 className={`${styles['titulo-card-mapa']} ${isPerdido ? styles['status-perdido'] : styles['status-encontrado']}`}>
          {isPerdido ? "PROCURA-SE" : "ENCONTRADO"}
        </h5>
        <Image
          src={pet.foto || "/assets/cachorrogatoinicial.jpg"}
          alt={identificacao}
          width={55}
          height={55}
          unoptimized={Boolean(pet.foto?.startsWith("/api/"))}
          className={styles['foto-card-mapa']}
        />
        {isPerdido && (
          <p className={styles['texto-card-mapa']}>Nome: {identificacao}</p>
        )}
        <p className={`${styles['texto-card-mapa']} ${isPerdido ? styles['status-perdido'] : styles['status-encontrado']}`}>
          Status: {isPerdido ? "Perdido" : "Encontrado"}
        </p>
        <CustomButton href={`/ocorrencias/${pet.id}`} size="small">
          Ver informações
        </CustomButton>
      </div>
    </div>
  );
}