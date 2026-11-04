import Image from "next/image";
import Link from "next/link";
import styles from "./home.module.css";

export default function Home() {
  return (
    <main>
      <section className={styles.secao}>
        <div className={styles.container}>
          <h1 className={styles.tituloDestaque}>PERDI O MEU PET</h1>
          <div className={styles.gridHome}>
            <div className={styles.colTexto}>
              <p className={styles.textos}>
                Perdeu ou encontrou um animal? Faça o cadastro.
              </p>
              <div className={styles.botoes}>
                <Link href="/ocorrencias/nova?tipo=PERDIDO" className={styles.btnCustom}>PERDI MEU PET</Link>
                <Link href="/ocorrencias/nova?tipo=ENCONTRADO" className={styles.btnCustom}>ENCONTREI UM PET</Link>
              </div>
            </div>
            <div className={styles.colImg}>
              <Image src="/assets/cachorrogatoinicial.jpg" alt="Cachorro e gato juntos" width={750} height={400} className={styles.imgBorda} priority />
            </div>
          </div>
        </div>
      </section>
      <section className={styles.secao}>
        <div className={styles.container}>
          <h2 className={styles.tituloDestaque}>O MAPA E RESGATES</h2>
          <div className={styles.gridHome + " " + styles.reverso}>
            <div className={styles.colTexto}>
              <p className={styles.textos}>
                Veja animais perdidos e encontrados em Votorantim.
              </p>
              <div className={styles.botoes}>
                <Link href="/mapa" className={styles.btnCustom}>VER MAPA DE ANIMAIS</Link>
              </div>
            </div>
            <div className={styles.colImg}>
              <Image src="/assets/cachorrogato2.jpg" alt="Cachorro e gato, imagem do PI original" width={750} height={400} className={styles.imgBorda} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
