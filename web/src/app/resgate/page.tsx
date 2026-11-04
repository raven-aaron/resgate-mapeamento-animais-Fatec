import Link from "next/link";

export default function ResgatePage() {
  return (
    <main className="site-wrap" style={{padding:"55px 0"}}>
      <span className="eyebrow">Módulo de resgate</span>
      <h1 style={{color:"var(--cor-verde-agua)",fontSize:"clamp(30px,5vw,45px)",margin:"14px 0"}}>Perdi meu Pet</h1>
      <p className="section-lead">Cadastre um animal perdido ou encontrado.</p>
      <div className="cards">
        <article className="card"><h2>Perdi um animal</h2><p>Cadastre seu pet desaparecido.</p><div className="action-row"><Link className="action action-primary" href="/ocorrencias/nova?tipo=PERDIDO">Registrar perda</Link></div></article>
        <article className="card"><h2>Encontrei um animal</h2><p>Registre um animal encontrado.</p><div className="action-row"><Link className="action action-primary" href="/ocorrencias/nova?tipo=ENCONTRADO">Registrar encontro</Link></div></article>
        <article className="card"><h2>Mapa do resgate</h2><p>Encontre animais na sua região.</p><div className="action-row"><Link className="action action-primary" href="/mapa">Ver animais no mapa</Link></div></article>
      </div>

    </main>
  );
}
