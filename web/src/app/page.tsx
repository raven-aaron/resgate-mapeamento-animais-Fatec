import Link from "next/link";

export default function Home() {
  return (
    <main>
      <section className="hero">
        <div className="site-wrap hero-inner">
          <div>
            <span className="eyebrow">Resgate e mapeamento de animais • Votorantim/SP</span>
            <h1>Mais caminhos para um <span>reencontro.</span></h1>
            <p>Um lugar para registrar animais perdidos ou encontrados e ajudar a reunir informações importantes sobre cada ocorrência. O projeto está em desenvolvimento e as publicações dependerão de aprovação.</p>
            <div className="action-row">
              <Link className="action action-primary" href="/ocorrencias/nova?tipo=PERDIDO">Perdi meu animal</Link>
              <Link className="action action-secondary" href="/ocorrencias/nova?tipo=ENCONTRADO">Encontrei um animal</Link>
            </div>
          </div>
          <div className="hero-art" aria-label="Ilustração simbólica de proteção animal">
            <span className="paw" aria-hidden="true">🐾</span>
            <small>INFORMAÇÃO • CUIDADO • REENCONTRO</small>
          </div>
        </div>
      </section>
      <section className="section site-wrap">
        <h2>Como o sistema vai funcionar</h2>
        <p className="section-lead">O fluxo principal será construído sobre as tabelas existentes do MySQL.</p>
        <div className="cards">
          <article className="card"><span className="card-number">01</span><h3>Cadastre</h3><p>Informe os dados do animal, o que aconteceu e a região aproximada, sem compartilhar endereços residenciais.</p></article>
          <article className="card"><span className="card-number">02</span><h3>Moderação</h3><p>Uma equipe responsável deverá analisar e aprovar a ocorrência antes de sua publicação.</p></article>
          <article className="card"><span className="card-number">03</span><h3>Localize</h3><p>Após a aprovação, cada ocorrência ativa deverá aparecer na listagem e no mapa público.</p></article>
        </div>
        <div className="action-row"><Link className="action action-secondary" href="/localizacao">Testar o mapa de localização</Link></div>
        <p className="section-lead" style={{marginTop:16,fontSize:13}}>O formulário e o mapa estão sendo integrados ao cadastro e ao banco. Nenhuma ocorrência é publicada automaticamente nesta versão.</p>
      </section>
    </main>
  );
}
