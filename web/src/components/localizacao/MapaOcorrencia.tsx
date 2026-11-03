"use client";

import { useEffect, useRef, useState } from "react";

type Ponto = { lat: number; lng: number };
type Mapa = { setView: (posicao: [number, number], zoom: number) => void; on: (evento: string, callback: (e: { latlng: Ponto }) => void) => void; remove: () => void };
type Marcador = { setLatLng: (posicao: [number, number]) => void; addTo: (mapa: Mapa) => Marcador; remove: () => void };
type Folheto = {
  map: (elemento: HTMLElement) => Mapa;
  tileLayer: (endereco: string, opcoes: { attribution: string; maxZoom: number }) => { addTo: (mapa: Mapa) => void };
  marker: (posicao: [number, number]) => Marcador;
};
export type LocalizacaoConfirmada = {
  latitude_aproximada: number;
  longitude_aproximada: number;
  origem_localizacao: "RUA" | "AJUSTE_USUARIO";
  precisao_localizacao: "RUA_APROXIMADA";
};
type Props = { cep: string; onConfirm: (valor: LocalizacaoConfirmada | null) => void };

const centro: Ponto = { lat: -23.5443, lng: -47.4491 };
const limitesProvisorios = { sul: -23.67, norte: -23.46, oeste: -47.58, leste: -47.35 };
function naRegiao(p: Ponto) {
  return p.lat >= limitesProvisorios.sul && p.lat <= limitesProvisorios.norte &&
    p.lng >= limitesProvisorios.oeste && p.lng <= limitesProvisorios.leste;
}
function leaflet() {
  return (window as unknown as { L?: Folheto }).L;
}

export default function MapaOcorrencia({ cep, onConfirm }: Props) {
  const el = useRef<HTMLDivElement>(null);
  const mapa = useRef<Mapa | null>(null);
  const marcador = useRef<Marcador | null>(null);
  const [pronto, setPronto] = useState(false);
  const [ponto, setPonto] = useState<Ponto | null>(null);
  const [origem, setOrigem] = useState<"RUA" | "AJUSTE_USUARIO">("AJUSTE_USUARIO");
  const [confirmado, setConfirmado] = useState(false);
  const [consultando, setConsultando] = useState(false);
  const [aviso, setAviso] = useState("Clique no mapa para selecionar um ponto público aproximado ou consulte uma sugestão pela rua.");

  function mover(p: Ponto, modo: "RUA" | "AJUSTE_USUARIO") {
    if (!naRegiao(p)) {
      setAviso("A seleção ficou fora da região de Votorantim; ajuste o ponto.");
      return;
    }
    const L = leaflet();
    if (!L || !mapa.current) return;
    if (marcador.current) marcador.current.setLatLng([p.lat, p.lng]);
    else marcador.current = L.marker([p.lat, p.lng]).addTo(mapa.current);
    setPonto(p);
    setOrigem(modo);
    setConfirmado(false);
    onConfirm(null);
  }

  useEffect(() => {
    let ativo = true;
    let script: HTMLScriptElement | null = null;
    function iniciar() {
      const L = leaflet();
      if (!ativo || !L || !el.current || mapa.current) return;
      const m = L.map(el.current);
      mapa.current = m;
      m.setView([centro.lat, centro.lng], 13);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
      }).addTo(m);
      m.on("click", (evento) => {
        const p = evento.latlng;
        if (!naRegiao(p)) {
          setAviso("Selecione uma posição na região de Votorantim.");
          return;
        }
        if (marcador.current) marcador.current.setLatLng([p.lat, p.lng]);
        else marcador.current = L.marker([p.lat, p.lng]).addTo(m);
        setPonto(p);
        setOrigem("AJUSTE_USUARIO");
        setConfirmado(false);
        onConfirm(null);
        setAviso("Ponto ajustado. Não selecione uma residência ou local exato.");
      });
      setPronto(true);
    }
    if (leaflet()) iniciar();
    else {
      script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = iniciar;
      script.onerror = () => setAviso("O mapa não carregou. Verifique a conexão.");
      document.body.appendChild(script);
    }
    return () => {
      ativo = false;
      mapa.current?.remove();
      mapa.current = null;
      marcador.current = null;
      script?.remove();
    };
    // O mapa só é criado na montagem; o callback atualiza estados do componente pai.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sugerir() {
    if (!pronto || consultando) return;
    setConsultando(true);
    setConfirmado(false);
    onConfirm(null);
    marcador.current?.remove();
    marcador.current = null;
    setPonto(null);
    try {
      const resposta = await fetch("/api/localizacao/geocodificar?cep=" + encodeURIComponent(cep), { cache: "no-store" });
      const dados = await resposta.json() as { erro?: string; aviso?: string; latitude?: number | null; longitude?: number | null };
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível obter uma sugestão.");
      const p = typeof dados.latitude === "number" && typeof dados.longitude === "number"
        ? { lat: dados.latitude, lng: dados.longitude } : null;
      if (p && naRegiao(p)) {
        mover(p, "RUA");
        mapa.current?.setView([p.lat, p.lng], 16);
      } else {
        setAviso("Sem ponto automático confiável. Clique no mapa e selecione uma região aproximada.");
        mapa.current?.setView([centro.lat, centro.lng], 13);
      }
      if (p && naRegiao(p)) setAviso(dados.aviso || "Confirme ou ajuste a sugestão.");
    } catch (error) {
      setAviso(error instanceof Error ? error.message : "Erro na consulta de localização.");
    } finally {
      setConsultando(false);
    }
  }

  function confirmar() {
    if (!ponto) return;
    onConfirm({
      latitude_aproximada: Number(ponto.lat.toFixed(6)),
      longitude_aproximada: Number(ponto.lng.toFixed(6)),
      origem_localizacao: origem,
      precisao_localizacao: "RUA_APROXIMADA",
    });
    setConfirmado(true);
    setAviso("Ponto aproximado confirmado no formulário. Os dados ainda não foram gravados no MySQL.");
  }

  return (
    <div style={{marginTop:20}}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,marginBottom:12}}>
        <strong>Selecione o ponto aproximado</strong>
        <button className="inline-action" type="button" disabled={!pronto || consultando} onClick={() => { void sugerir(); }} style={{marginTop:0}}>
          {consultando ? "Consultando..." : "Sugerir ponto pela rua"}
        </button>
      </div>
      <div ref={el} aria-label="Mapa para selecionar o local aproximado da ocorrência" style={{height:340,width:"100%",borderRadius:12,background:"#e4ece8",zIndex:0}}/>
      <p role="status" style={{fontSize:13,lineHeight:1.6,color:"var(--muted)"}}>{aviso}</p>
      {ponto && <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <span style={{fontSize:13}}>Ponto: {ponto.lat.toFixed(5)}, {ponto.lng.toFixed(5)}</span>
        <button className="action action-primary" type="button" disabled={confirmado} onClick={confirm}>
          {confirmado ? "Ponto confirmado" : "Confirmar posição aproximada"}
        </button>
      </div>}
      <p style={{fontSize:12,color:"var(--muted)",lineHeight:1.5}}>O ponto deve representar uma região pública, nunca a localização exata de uma residência. Os limites geográficos são provisórios; a validação definitiva será feita no backend.</p>
    </div>
  );
}
