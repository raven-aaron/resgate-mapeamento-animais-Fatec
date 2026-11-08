'use client';

import Image from 'next/image';
import CustomButton from '../components/CustomButton';
import styles from './home.module.css';

export default function HomePage() {
  return (
    <main>
      <section className={styles.secao}>
        <div className={styles.container}>
          <h1 className={styles.tituloDestaque}>PERDI O MEU PET</h1>
          <div className={styles.gridHome}>
            <div className={styles.colTexto}>
              <p className={styles.textos}>
                Por meio de um mapa interativo, é possível cadastrar animais que seus tutores perderam 
                ou pets que foram encontrados, permitindo que as informações fiquem disponíveis de 
                forma rápida e acessível para todos.
              </p>
              <div className={styles.botoes}>
                <CustomButton href="/login" variant="green">PERDI MEU PET</CustomButton>
                <CustomButton href="/login" variant="green">ENCONTREI UM PET</CustomButton>
              </div>
            </div>
            <div className={styles.colImg}>
              <Image src="/assets/cachorrogatoinicial.jpg" alt="Pets" width={750} height={400} className={styles.imgBorda} />
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
                Quando um animal é sinalizado no sistema, a equipe de responsável avalia a situação e realiza o resgate 
                quando necessário. Assim, garantimos que nenhum pet fique desamparado, seja para devolução ao tutor ou 
                para acolhimento temporário seguro.
              </p>
              <div className={styles.botoes}>
                <CustomButton href="/mapa">ACESSE O MAPA</CustomButton>
              </div>
            </div>
            <div className={styles.colImg}>
              <Image src="/assets/cachorrogato2.jpg" alt="Resgate" width={750} height={400} className={styles.imgBorda} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}