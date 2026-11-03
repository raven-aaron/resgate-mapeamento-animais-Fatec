"use client";

import { useEffect, useRef, useState } from "react";
import type { Ocorrencia } from "../../lib/tipos";

type Mapa = {
  setView: (pos: [number, number], zoom: number) => Mapa;
  remove: () => void;
  removeLayer: (m: Marcador) => void;
};
type Marcador = { addTo: (m: Mapa) => Marcador; bindPopup: (content: HTMLElement, options?: object) => Marcador };
type Folheto = {
  map: (el: HTMLElement) => Mapa;
  tileLayer: (url: string, opts: { attribution: string; maxZoom: number }) => { addTo: (m: Mapa) => void };
  marker: (pos: [number, number], options?: { icon: object }) => Marcador;
  divIcon: (opts: { className: string; html: string; iconSize: [number,number]; iconAnchor:[number,number] }) => object;
};

function API(): Folheto | undefined { return (window as unknown as { L?: Folheto }).L; }
function linha(titulo: string, valor: string) {
  const p=document.createElement("p");
  const strong=document.createElement("strong"); strong.textContent=titulo; p.append(strong, document.createTextNode(valor)); return p;
}

export default function MapaPublico({ ocorrencias }: { ocorrencias: Ocorrencia[] }) {
  const el = useRef<HTMLDivElement>(null);
  const mapa = useRef<Mapa | null>(null);
  const marcadores = useRef<Marcador[]>([]);
  const [pronto,setPronto] = useState(false);
  const [erro,setErro] = useState("");
  useEffect(()=>{
    let ativo=true;
    let script: HTMLScriptElement | null=null;
    function iniciar(){
      const L=API();
      if(!ativo || !L || !el.current || mapa.current)return;
      const m=L.map(el.current);
      mapa.current=m;
      m.setView([-23.5443,-47.4491],13);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{
        attribution:'© OpenStreetMap contributors',maxZoom:19,
      }).addTo(m);
      setPronto(true);
    }
    if(API())iniciar();
    else {
      script=document.createElement("script");
      script.src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload=iniciar;
      script.onerror=()=>setErro("O mapa não pôde ser carregado. Utilize a visualização por cards.");
      document.body.appendChild(script);
    }
    return ()=>{
      ativo=false;
      marcadores.current=[];
      mapa.current?.remove();
      mapa.current=null;
      script?.remove();
    };
  },[]);
  useEffect(()=>{
    const L=typeof window!=="undefined"?API():undefined;
    const m=mapa.current;
    if(!pronto || !L || !m)return;
    marcadores.current.forEach(marker=>m.removeLayer(marker));
    marcadores.current=[];
    const repeticoes=new Map<string,number>();
    const totais=new Map<string,number>();
    for(const o of ocorrencias){
      if(typeof o.latitude==="number"&&typeof o.longitude==="number"){
        const chave=o.latitude+","+o.longitude;
        totais.set(chave,(totais.get(chave)||0)+1);
      }
    }
    for(const o of ocorrencias){
      if(typeof o.latitude!=="number"||typeof o.longitude!=="number")continue;
      const perdido=o.tipo==="PERDIDO";
      const classe=perdido?"pin-publico pin-perdido":"pin-publico pin-encontrado";
      const icone=L.divIcon({className:"",html:'<div class="'+classe+'">🐾</div>',iconSize:[38,44],iconAnchor:[19,42]});
      const chave=o.latitude+","+o.longitude;
      const posicao=repeticoes.get(chave)||0;
      repeticoes.set(chave,posicao+1);
      const n=totais.get(chave)||1;
      const angulo=2*Math.PI*posicao/n;
      // Deslocamento visual pequeno quando vários animais compartilham um ponto aproximado.
      const deslocamento=n>1?0.00036:0;
      const marker=L.marker([o.latitude+Math.sin(angulo)*deslocamento,o.longitude+Math.cos(angulo)*deslocamento],{icon:icone}).addTo(m);
      const conteudo=document.createElement("div");conteudo.className="popup-pet";
      const titulo=document.createElement("strong");titulo.textContent=perdido?"PROCURA-SE":"ENCONTRADO";titulo.className=perdido?"status-perdido":"status-encontrado";conteudo.append(titulo);
      if(o.foto && /^\/uploads\/[0-9a-f-]+\.(jpg|png|webp)$/.test(o.foto)){
        const img=document.createElement("img");img.src=o.foto;img.alt="Foto do animal";img.loading="lazy";conteudo.append(img);
      }
      conteudo.append(linha("Animal: ",o.nome || o.especie));
      conteudo.append(linha("Região: ",o.bairro));
      const botao=document.createElement("a");botao.href="/ocorrencias/"+o.id;botao.className="action action-primary";botao.textContent="Ver informações";conteudo.append(botao);
      marker.bindPopup(conteudo,{maxWidth:250});
      marcadores.current.push(marker);
    }
  },[pronto,ocorrencias]);
  return <div>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <div ref={el} className="mapa-publico" aria-label="Mapa interativo de animais perdidos e encontrados em Votorantim" />
    {erro && <p role="alert" className="note note-warning">{erro}</p>}
    {!pronto && !erro && <p role="status">Carregando mapa...</p>}
  </div>;
}
