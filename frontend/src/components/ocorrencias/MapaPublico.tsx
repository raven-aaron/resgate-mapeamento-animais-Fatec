"use client";

import { useEffect, useRef, useState } from "react";
import type { Ocorrencia } from "../../lib/tipos";
import { fotoPermitidaNoMapa } from "../../lib/foto-url";
import { identificacaoAnimal } from "../../lib/identificacao-animal";
import { carregarLeaflet, type MapaLeaflet, type MarcadorLeaflet } from "../../lib/mapa-browser";

function linha(titulo: string, valor: string) {
  const p=document.createElement("p");
  const strong=document.createElement("strong"); strong.textContent=titulo; p.append(strong, document.createTextNode(valor)); return p;
}

export default function MapaPublico({ ocorrencias }: { ocorrencias: Ocorrencia[] }) {
  const el = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLeaflet | null>(null);
  const marcadores = useRef<MarcadorLeaflet[]>([]);
  const enquadrouPontos = useRef(false);
  const [pronto,setPronto] = useState(false);
  const [erro,setErro] = useState("");
  useEffect(()=>{
    let ativo=true;
    void carregarLeaflet().then(L=>{
      if(!ativo || !el.current || mapa.current)return;
      const instancia=L.map(el.current);
      mapa.current=instancia;
      instancia.setView([-23.5443,-47.4491],13);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{
        attribution:"© OpenStreetMap contributors",maxZoom:19,
      }).addTo(instancia);
      setPronto(true);
    }).catch(()=>{
      if(ativo)setErro("Não foi possível carregar o mapa. Utilize a visualização por cards.");
    });
    return ()=>{
      ativo=false;
      marcadores.current=[];
      mapa.current?.remove();
      mapa.current=null;
    };
  },[]);
  useEffect(()=>{
    const m=mapa.current;
    if(!pronto || !m)return;
    let ativo=true;
    void carregarLeaflet().then(L=>{
    if(!ativo || !mapa.current)return;
    marcadores.current.forEach(marker=>m.removeLayer(marker));
    marcadores.current=[];
    const pontosVisiveis:[number,number][]=[];
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
      const coordenadas:[number,number]=[o.latitude+Math.sin(angulo)*deslocamento,o.longitude+Math.cos(angulo)*deslocamento];
      pontosVisiveis.push(coordenadas);
      const marker=L.marker(coordenadas,{icon:icone}).addTo(m);
      const conteudo=document.createElement("div");conteudo.className="popup-pet";
      const titulo=document.createElement("strong");
      titulo.textContent=perdido?"PROCURA-SE":"ENCONTRADO";
      titulo.className=perdido?"status-perdido":"status-encontrado";
      conteudo.append(titulo);

      // A foto principal deve aparecer ao lado do nome do animal.
      const identidade=document.createElement("div");identidade.className="popup-pet-identidade";
      const miniatura=document.createElement("div");miniatura.className="popup-pet-miniatura";
      const nomeAnimal=identificacaoAnimal(o.tipo,o.nome,o.especie);
      if(fotoPermitidaNoMapa(o.foto)){
        const img=document.createElement("img");
        img.src=o.foto;img.alt="Foto principal de "+nomeAnimal;img.loading="lazy";img.decoding="async";
        img.onerror=()=>{img.remove();miniatura.textContent="🐾";miniatura.classList.add("sem-imagem");};
        miniatura.append(img);
      } else {
        miniatura.textContent="🐾";
        miniatura.classList.add("sem-imagem");
      }
      const identidadeTexto=document.createElement("div");identidadeTexto.className="popup-pet-identidade-texto";
      const nome=document.createElement("strong");nome.className="popup-pet-nome";nome.textContent=nomeAnimal;
      const especie=document.createElement("span");especie.className="popup-pet-especie";especie.textContent=o.especie;
      identidadeTexto.append(nome,especie);
      identidade.append(miniatura,identidadeTexto);
      conteudo.append(identidade);
      conteudo.append(linha("Região: ",o.bairro));
      const botao=document.createElement("a");
      botao.href="/ocorrencias/"+o.id;botao.className="custom-button custom-button--green custom-button--small";
      botao.textContent="Ver cartaz completo";conteudo.append(botao);
      marker.bindPopup(conteudo,{maxWidth:270,minWidth:180});
      marcadores.current.push(marker);
    }
    // Enquadra todos os bairros no primeiro carregamento, sem retirar o zoom manual
    // escolhido pelo visitante quando os filtros mudam.
    if(!enquadrouPontos.current && pontosVisiveis.length>1){
      m.fitBounds(pontosVisiveis,{padding:[28,28],maxZoom:13});
      enquadrouPontos.current=true;
    }
    }).catch(()=>{ if(ativo)setErro("Não foi possível atualizar o mapa."); });
    return ()=>{ativo=false;};
  },[pronto,ocorrencias]);
  return <div>
    <div ref={el} className="mapa-publico" aria-label="Mapa interativo de animais perdidos e encontrados em Votorantim" />
    {erro && <p role="alert" className="note note-warning">{erro}</p>}
    {!pronto && !erro && <p role="status">Carregando mapa...</p>}
  </div>;
}
