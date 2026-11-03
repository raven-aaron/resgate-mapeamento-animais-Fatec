"use client";
import { useEffect, useRef, useState } from "react";
import { carregarLeaflet, type MapaLeaflet } from "../../lib/mapa-browser";

type Zona={latitude:number;longitude:number;total:number;perdidos:number;encontrados:number};
export default function MapaCalorAdministrativo(){
  const elemento=useRef<HTMLDivElement|null>(null);
  const mapa=useRef<MapaLeaflet|null>(null);
  const [zonas,setZonas]=useState<Zona[]>([]);
  const [erro,setErro]=useState("");
  const [pronto,setPronto]=useState(false);

  useEffect(()=>{
    const controlador=new AbortController();
    void fetch("/api/admin/mapa-termico",{signal:controlador.signal,cache:"no-store"})
      .then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.erro||"Erro na consulta");return d;})
      .then(d=>{if(!controlador.signal.aborted)setZonas(d.zonas||[]);})
      .catch(e=>{if(!controlador.signal.aborted)setErro(e instanceof Error?e.message:"Erro ao buscar dados");});
    return ()=>controlador.abort();
  },[]);

  useEffect(()=>{
    let ativo=true;
    void carregarLeaflet().then(L=>{
      if(!ativo || !elemento.current)return;
      const m=L.map(elemento.current);
      mapa.current=m;
      m.setView([-23.5443,-47.4491],12);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{
        attribution:"© OpenStreetMap contributors",maxZoom:19
      }).addTo(m);
      setPronto(true);
    }).catch(()=>{if(ativo)setErro("Mapa indisponível. Consulte os indicadores por bairro.");});
    return ()=>{ativo=false;mapa.current?.remove();mapa.current=null;};
  },[]);

  useEffect(()=>{
    const m=mapa.current;
    if(!pronto||!m)return;
    let ativo=true;
    void carregarLeaflet().then(L=>{
      if(!ativo)return;
      const maximo=Math.max(1,...zonas.map(z=>Number(z.total)));
      for(const z of zonas){
        const fator=Number(z.total)/maximo;
        const circulo=L.circle([Number(z.latitude),Number(z.longitude)],{
          radius:300+500*fator,color:fator>.65?"#F24405":"#FA7F08",weight:2,
          fillColor:fator>.65?"#F24405":"#FA7F08",fillOpacity:.18+.38*fator
        }).addTo(m);
        const dados=document.createElement("div");
        const titulo=document.createElement("strong");titulo.textContent="Zona com "+Number(z.total)+" ocorrências";dados.append(titulo);
        const p=document.createElement("p");p.textContent=Number(z.perdidos)+" perdidos · "+Number(z.encontrados)+" encontrados";dados.append(p);
        circulo.bindPopup(dados);
      }
    });
    return ()=>{ativo=false;};
  },[pronto,zonas]);
  return <section>
    <div ref={elemento} className="mapa-publico" aria-label="Mapa administrativo de concentração de ocorrências" />
    {erro&&<p className="note note-warning" role="alert">{erro}</p>}
    {!pronto&&!erro&&<p role="status">Carregando mapa...</p>}
    <p style={{fontSize:13,color:"var(--cor-cinza)",lineHeight:1.6}}>As zonas representam concentrações aproximadas por região e não endereços individuais.</p>
  </section>;
}
