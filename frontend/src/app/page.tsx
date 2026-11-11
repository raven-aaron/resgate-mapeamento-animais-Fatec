"use client";

import Image from "next/image";
import CustomButton from "../components/CustomButton";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <main>
      <section className={styles.secao}>
        <div className={styles.container}>
          <h1 className={styles.tituloDestaque}>
            RESGATE E MAPEAMENTO DE ANIMAIS
          </h1>
          <div className={styles.gridHome}>
            <div className={styles.colTexto}>
              <p className={styles.textos}>
                Cadastre um pet perdido ou um animal encontrado que possa estar
                longe de seu tutor. As ocorrências ficam disponíveis em um mapa
                interativo e em cartazes para consulta, facilitando a busca e ajudando a reunir
                animais e seus tutores.
              </p>
              <div className={styles.botoes}>
                <CustomButton href="/registro-pet-perdido" variant="green">
                  PERDI MEU PET
                </CustomButton>
                <CustomButton href="/registro-pet-encontrado" variant="green">
                  ENCONTREI UM PET
                </CustomButton>
              </div>
            </div>
            <div className={styles.colImg}>
              <Image
                src="/assets/cachorrogatoinicial.jpg"
                alt="Pets"
                width={750}
                height={400}
                className={styles.imgBorda}
              />
            </div>
          </div>
        </div>
      </section>

      <section className={styles.secao}>
        <div className={styles.container}>
          <h1 className={styles.tituloDestaque}>CONSULTE OS RESGATES</h1>
          <div className={`${styles.gridHome} ${styles.reverso}`}>
            <div className={styles.colTexto}>
              <p className={styles.textos}>
                Cada ocorrência passa por uma avaliação da equipe responsável
                antes de ser publicada. A comunidade também contribui com
                informações e ajuda na identificação dos animais. Pelo chat
                integrado, as pessoas podem se comunicar e facilitar o
                reencontro dos pets com seus tutores.
              </p>
              <div className={styles.botoes}>
                <CustomButton href="/mapa" variant="green">VER NO MAPA</CustomButton>
              </div>
            </div>
            <div className={styles.colImg}>
              <Image
                src="/assets/cachorrogato2.jpg"
                alt="Resgate"
                width={750}
                height={400}
                className={styles.imgBorda}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
