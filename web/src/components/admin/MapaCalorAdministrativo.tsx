"use client";
import { useEffect, useRef, useState } from "react";

type Zona={latitude:number;longitude:number;total:number;perdidos:number;encontrados:number};
type Circulo={bindPopup:(conteudo:HTMLElement)=>void};
type Folheto={
  map:(el:HTMLElement)=>{setView:(p:[number,number],zoom:number)=>void;remove:()=>void};
  tileLayer:(url:string,opts:{attribution:string;maxZoom:number})=>{addTo:(mapa:object)=>void};
  circle:(p:[number,number],opts:{radius:number,color:string,weight:number,fillColor:string,fillOpacity:number})=>{addTo:(mapa:object)=>Circulo};
};
function leaflet():Folheto|undefined{return (window as unknown as {L?:Folheto}).L;}

export default function MapaCalorAdministrativo(){
  const elemento=useRef<HTMLDivElement|null>(null);
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
    let script:HTMLScriptElement|null=null;
    let mapa:ReturnType<Folheto["map"]>|null=null;
    function iniciar(){
      const L=leaflet();
      if(!ativo||!L||!elemento.current)return;
      mapa=L.map(elemento.current);
      mapa.setView([-23.5443,-47.4491],12);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{
        attribution:"© OpenStreetMap contributors",maxZoom:19
      }).addTo(mapa);
      const maximo=Math.max(1,...zonas.map(z=>Number(z.total)));
      for(const z of zonas){
        const fator=Number(z.total)/maximo;
        const circulo=L.circle([Number(z.latitude),Number(z.longitude)],{
          radius:300+500*fator,color:fator>.65?"#F24405":"#FA7F08",weight:2,
          fillColor:fator>.65?"#F24405":"#FA7F08",fillOpacity:.18+.38*fator
        }).addTo(mapa);
        const dados=document.createElement("div");
        const titulo=document.createElement("strong");titulo.textContent="Zona com "+Number(z.total)+" ocorrências";dados.append(titulo);
        const p=document.createElement("p");p.textContent=Number(z.perdidos)+" perdidos · "+Number(z.encontrados)+" encontrados";dados.append(p);
        circulo.bindPopup(dados);
      }
      setPronto(true);
    }
    if(leaflet())iniciar();
    else{script=document.createElement("script");script.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";script.onload=iniciar;script.onerror=()=>{if(ativo)setErro("Mapa indisponível; os indicadores por bairro continuam disponíveis.");};document.body.appendChild(script);}
    return ()=>{ativo=false;mapa?.remove();script?.remove();};
  },[zonas]);
  return <section>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
    <div ref={elemento} className="mapa-publico" aria-label="Mapa administrativo de concentração de ocorrências aprovadas" />
    {erro&&<p className="note note-warning" role="alert">{erro}</p>}
    {!pronto&&!erro&&<p role="status">Carregando mapa de concentração...</p>}
    <p style={{fontSize:13,color:"var(--cor-cinza)",lineHeight:1.6}}>Círculos indicam zonas agregadas de aproximadamente 1 km, não endereços ou posições individuais. As ocorrências são agrupadas e computadas apenas após aprovação e enquanto abertas.</p>
  </section>;
}
