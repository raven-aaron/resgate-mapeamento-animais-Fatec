import Image from "next/image";
import Link from "next/link";
import styles from "./home.module.css";
import VitrinePublica from "../components/ocorrencias/VitrinePublica";

export default function Home() {
  return (
    <main>
      <VitrinePublica/>
      <section className={styles.secao}>
        <div className={styles.container}>
          <h1 className={styles.tituloDestaque}>PERDI O MEU PET</h1>
          <div className={styles.gridHome}>
            <div className={styles.colTexto}>
              <p className={styles.textos}>
                Por meio de um mapa interativo, é possível cadastrar animais perdidos ou encontrados em Votorantim, facilitando a divulgação das informações e o reencontro com seus tutores.
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
                As ocorrências passam por análise administrativa antes de aparecerem publicamente. A região informada é aproximada, preservando a privacidade dos moradores e dos responsáveis pelos animais.
              </p>
              <div className={styles.botoes}>
                <Link href="/mapa" className={styles.btnCustom}>VER MAPA DE ANIMAIS</Link>
              </div>
            </div>
            <div className={styles.colImg}>
              <Image src="/assets/cachorrogato2.jpg" alt="Cachorro e gato, imagem do PI original" width={750} height={400} className={styles.imgBorda} />
            </div>
          </div>
          <p className={styles.aviso}>Consulte no mapa e nos cards as ocorrências aprovadas e ativas. Você também pode registrar um animal perdido ou encontrado.</p>
        </div>
      </section>
    </main>
  );
}
