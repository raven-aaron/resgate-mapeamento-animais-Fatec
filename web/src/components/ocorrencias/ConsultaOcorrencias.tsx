"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import MapaPublico from "./MapaPublico";
import type { Ocorrencia } from "../../lib/tipos";

export default function ConsultaOcorrencias() {
  const [modo, setModo] = useState<"mapa" | "cards">("mapa");
  const [especie, setEspecie] = useState("");
  const [porte, setPorte] = useState("");
  const [sexo, setSexo] = useState("");
  const [tipo, setTipo] = useState("");
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const controlador = new AbortController();
    const params = new URLSearchParams();
    if (especie) params.set("especie", especie);
    if (porte) params.set("porte", porte);
    if (sexo) params.set("sexo", sexo);
    if (tipo) params.set("tipo", tipo);
    async function carregar() {
      setCarregando(true);
      setErro("");
      try {
        const resposta = await fetch("/api/ocorrencias?" + params.toString(), { cache:"no-store",signal:controlador.signal });
        const dados = await resposta.json() as { ocorrencias?: Ocorrencia[]; erro?: string };
        if (!resposta.ok) throw new Error(dados.erro || "Falha na consulta.");
        setOcorrencias(dados.ocorrencias || []);
      } catch (e) {
        if (!controlador.signal.aborted) setErro(e instanceof Error ? e.message : "Falha na consulta.");
      } finally { if (!controlador.signal.aborted) setCarregando(false); }
    }
    void carregar();
    return () => controlador.abort();
  }, [especie, porte, sexo, tipo]);

  return (
    <main className="site-wrap" style={{padding:"34px 0 50px"}}>
      <header className="form-heading">
        <span className="eyebrow">Resgate e Mapeamento</span>
        <h1>ANIMAIS PERDIDOS E ENCONTRADOS</h1>
        <p>Consulte as ocorrências aprovadas em Votorantim. Explore cada pin ou alterne para os cards; os mesmos filtros são aplicados às duas visualizações.</p>
      </header>
      <section className="form-panel">
        <h2>Filtrar ocorrências</h2>
        <div className="filtros-publicos">
          <label className="form-field">Espécie<select value={especie} onChange={e=>setEspecie(e.target.value)}>
            <option value="">Todas</option><option value="Cachorro">Cachorro</option><option value="Gato">Gato</option>
          </select></label>
          <label className="form-field">Porte<select value={porte} onChange={e=>setPorte(e.target.value)}>
            <option value="">Todos</option><option value="PEQUENO">Pequeno</option><option value="MEDIO">Médio</option><option value="GRANDE">Grande</option>
          </select></label>
          <label className="form-field">Situação<select value={tipo} onChange={e=>setTipo(e.target.value)}>
            <option value="">Todas</option><option value="PERDIDO">Perdido</option><option value="ENCONTRADO">Encontrado</option>
          </select></label>
          <label className="form-field">Sexo<select value={sexo} onChange={e=>setSexo(e.target.value)}>
            <option value="">Todos</option><option value="MACHO">Macho</option><option value="FEMEA">Fêmea</option>
          </select></label>
        </div>
        <div className="filtros-acoes">
          <button type="button" className="inline-action" style={{marginTop:0}} onClick={()=>{setEspecie("");setPorte("");setTipo("");setSexo("");}}>Limpar filtros</button>
          <span role="status">{carregando ? "Buscando ocorrências..." : ocorrencias.length + " ocorrência(s) encontrada(s)"}</span>
          <div className="seletor-modo" aria-label="Modo de visualização">
            <button type="button" aria-pressed={modo==="mapa"} className={modo==="mapa"?"ativo":""} onClick={()=>setModo("mapa")}>Mapa</button>
            <button type="button" aria-pressed={modo==="cards"} className={modo==="cards"?"ativo":""} onClick={()=>setModo("cards")}>Cards</button>
          </div>
        </div>
      </section>
      {erro && <p className="note note-warning" role="alert">{erro}</p>}
      {modo==="mapa" ? <section aria-label="Mapa de ocorrências">
        <MapaPublico ocorrencias={ocorrencias} />
        <p style={{fontSize:13,color:"var(--cor-cinza)"}}>Cada marcador representa uma ocorrência aprovada e ativa. Os pontos públicos são aproximados para preservar a privacidade.</p>
      </section> : <section className="cards-ocorrencias" aria-label="Lista de animais">
        {ocorrencias.map(o=><article className="cartao-ocorrencia" key={o.id}>
          {o.foto ? <Image src={o.foto} alt={"Foto do animal "+o.id} unoptimized width={340} height={220}/> : <div className="sem-foto">🐾</div>}
          <div className="corpo-cartao">
            <strong className={o.tipo==="PERDIDO"?"status-perdido":"status-encontrado"}>{o.tipo==="PERDIDO"?"PROCURA-SE":"ENCONTRADO"}</strong>
            <h3>{o.nome || o.especie}</h3>
            <p>{o.especie} • {o.bairro} • Votorantim/SP</p>
            <p>Porte: {o.porte==="INDETERMINADO"?"Não informado":o.porte.toLowerCase()} · Sexo: {o.sexo==="INDETERMINADO"?"Não informado":o.sexo.toLowerCase()}</p>
            <p>Data: {String(o.data).slice(0,10).split("-").reverse().join("/")}</p>
            <Link href={"/ocorrencias/"+o.id} className="action action-primary">VER CARTAZ</Link>
          </div>
        </article>)}
        {!carregando && !erro && ocorrencias.length===0 && <div className="form-panel"><p>Nenhuma ocorrência aprovada e ativa corresponde aos filtros selecionados.</p></div>}
      </section>}
      <div className="action-row"><Link className="action action-secondary" href="/resgate">Voltar ao módulo de resgate</Link></div>
    </main>
  );
}
