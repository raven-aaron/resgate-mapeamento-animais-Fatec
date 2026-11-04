import Link from "next/link";

export default function ResgatePage() {
  return (
    <main className="site-wrap" style={{padding:"55px 0"}}>
      <span className="eyebrow">Módulo de resgate</span>
      <h1 style={{color:"var(--cor-verde-agua)",fontSize:"clamp(30px,5vw,45px)",margin:"14px 0"}}>Perdi meu Pet</h1>
      <p className="section-lead">Registre um animal perdido ou encontrado em Votorantim. O cadastro inclui informações do pet, CEP validado e localização pública aproximada.</p>
      <div className="cards">
        <article className="card"><h2>Perdi um animal</h2><p>Informe os dados do animal para preparar uma ocorrência de desaparecimento.</p><div className="action-row"><Link className="action action-primary" href="/ocorrencias/nova?tipo=PERDIDO">Registrar perda</Link></div></article>
        <article className="card"><h2>Encontrei um animal</h2><p>Descreva o animal encontrado e a região em que foi visto.</p><div className="action-row"><Link className="action action-primary" href="/ocorrencias/nova?tipo=ENCONTRADO">Registrar encontro</Link></div></article>
        <article className="card"><h2>Mapa do resgate</h2><p>Consulte todos os animais aprovados no mapa interativo ou na visualização em cards, com filtros.</p><div className="action-row"><Link className="action action-primary" href="/mapa">Ver animais no mapa</Link></div></article>
      </div>
<p className="note" style={{marginTop:24}}>O cadastro exige uma conta e envia a ocorrência para moderação. As aprovações tornam os registros visíveis no mapa público e nos cards.</p>
    </main>
  );
}
