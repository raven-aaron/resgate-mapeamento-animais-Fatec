"use client";

import Image from "next/image";
import CustomButton from "../components/CustomButton";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <main>
      <section className={styles.secao}>
        <div className={styles.container}>
          <h1 className={styles.tituloDestaque}>RESGATE E MAPEAMENTO DE ANIMAIS</h1>
          <div className={styles.gridHome}>
            <div className={styles.colTexto}>
              <p className={styles.textos}>
                Cadastre um pet perdido ou um animal encontrado que possa estar
                longe de seu tutor. As ocorrências ficam disponíveis em um mapa
                interativo da região, facilitando a busca e ajudando a reunir
                animais e seus tutores.
              </p>
              <div className={styles.botoes}>
                <CustomButton href="/login" variant="green">
                  PERDI MEU PET
                </CustomButton>
                <CustomButton href="/login" variant="green">
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
          <h1 className={styles.tituloDestaque}>O MAPA E RESGATES</h1>
          <div className={`${styles.gridHome} ${styles.reverso}`}>
            <div className={styles.colTexto}>
              <p className={styles.textos}>
                Cada ocorrência cadastrada passa por uma avaliação da equipe
                responsável antes de ser disponibilizada na plataforma. A
                comunidade também tem um papel fundamental nesse processo,
                contribuindo com informações e ajudando na identificação dos
                animais. Por meio do chat integrado, é possível facilitar a
                comunicação entre as pessoas envolvidas e agilizar o reencontro
                dos pets com seus tutores. Quando necessário, também é possível
                entrar em contato com o setor de Bem-Estar Animal para solicitar
                orientação e apoio.
              </p>
              <div className={styles.botoes}>
                <CustomButton href="/mapa">ACESSE O MAPA</CustomButton>
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
