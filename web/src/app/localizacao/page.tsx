"use client";

import { useEffect, useRef, useState } from "react";

type Ponto = { lat: number; lng: number };
type LeafletMap = { setView: (p: [number, number], zoom: number) => void; on: (event: string, cb: (e: { latlng: Ponto }) => void) => void; remove: () => void };
type LeafletMarker = { setLatLng: (p: [number, number]) => void; addTo: (map: LeafletMap) => LeafletMarker };
type LeafletApi = {
  map: (el: HTMLElement) => LeafletMap;
  tileLayer: (url: string, opts: { attribution: string; maxZoom: number }) => { addTo: (map: LeafletMap) => void };
  marker: (p: [number, number]) => LeafletMarker;
};
declare global { interface Window { L?: LeafletApi } }

const CENTRO: Ponto = { lat: -23.5443, lng: -47.4491 };
const limites = { sul: -23.67, norte: -23.46, oeste: -47.58, leste: -47.35 };
function dentro(p: Ponto) {
  return p.lat >= limites.sul && p.lat <= limites.norte && p.lng >= limites.oeste && p.lng <= limites.leste;
}
function numero(n: number) { return n.toFixed(6); }

export default function LocalizacaoPage() {
  const [cep, setCep] = useState("18110020");
  const [ponto, setPonto] = useState<Ponto | null>(null);
  const [sugestao, setSugestao] = useState<Ponto | null>(null);
  const [mensagem, setMensagem] = useState("Informe o CEP e consulte a localização sugerida.");
  const [carregando, setCarregando] = useState(false);
  const [confirmado, setConfirmado] = useState(false);
  const [mapaPronto, setMapaPronto] = useState(false);
  const mapaEl = useRef<HTMLDivElement>(null);
  const mapa = useRef<LeafletMap | null>(null);
  const marcador = useRef<LeafletMarker | null>(null);
  const pontoAtual = useRef<Ponto | null>(null);

  function atualizarPonto(p: Ponto) {
    if (!dentro(p)) {
      setMensagem("Selecione uma posição dentro da região de Votorantim.");
      return;
    }
    pontoAtual.current = p;
    setPonto(p);
    setConfirmado(false);
    if (window.L && mapa.current) {
      if (!marcador.current) marcador.current = window.L.marker([p.lat, p.lng]).addTo(mapa.current);
      else marcador.current.setLatLng([p.lat, p.lng]);
    }
  }

  useEffect(() => {
    let ativo = true;
    let script: HTMLScriptElement | null = null;
    function iniciar() {
      if (!ativo || !window.L || !mapaEl.current || mapa.current) return;
      const L = window.L;
      const m = L.map(mapaEl.current);
      mapa.current = m;
      m.setView([CENTRO.lat, CENTRO.lng], 14);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
      }).addTo(m);
      m.on("click", (evento) => {
        const p = evento.latlng;
        if (!dentro(p)) { setMensagem("O ponto deve permanecer na região de Votorantim."); return; }
        pontoAtual.current = p;
        setPonto(p);
        setConfirmado(false);
        if (!marcador.current) marcador.current = L.marker([p.lat, p.lng]).addTo(m);
        else marcador.current.setLatLng([p.lat, p.lng]);
        setMensagem("Posição ajustada. Confirme apenas uma região pública aproximada, nunca uma residência.");
      });
      setMapaPronto(true);
    }
    if (window.L) iniciar();
    else {
      script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = iniciar;
      script.onerror = () => setMensagem("Não foi possível carregar o mapa. Verifique a conexão.");
      document.body.appendChild(script);
    }
    return () => { ativo = false; mapa.current?.remove(); mapa.current = null; marcador.current = null; script?.remove(); };
  }, []);

  async function consultar() {
    const limpo = cep.replace(/\D/g, "");
    if (!/^\d{8}$/.test(limpo)) { setMensagem("Informe um CEP válido com 8 dígitos."); return; }
    setCarregando(true);
    setConfirmado(false);
    setPonto(null);
    setSugestao(null);
    marcador.current = null;
    try {
      const resposta = await fetch(`/api/localizacao/geocodificar?cep=${limpo}`, { cache: "no-store" });
      const dados = await resposta.json() as { erro?: string; aviso?: string; latitude?: number | null; longitude?: number | null };
      if (!resposta.ok) { setMensagem(dados.erro ?? "Erro na consulta."); return; }
      const p = typeof dados.latitude === "number" && typeof dados.longitude === "number"
        ? { lat: dados.latitude, lng: dados.longitude } : null;
      if (p && dentro(p)) {
        setSugestao(p);
        atualizarPonto(p);
        mapa.current?.setView([p.lat, p.lng], 16);
      } else {
        mapa.current?.setView([CENTRO.lat, CENTRO.lng], 13);
      }
      setMensagem(dados.aviso ?? "Clique no mapa para indicar uma região aproximada.");
    } catch {
      setMensagem("Não foi possível consultar a localização.");
    } finally { setCarregando(false); }
  }

  function confirmar() {
    if (!ponto) return;
    setConfirmado(true);
    setMensagem("Localização aproximada confirmada nesta tela. O cadastro e a gravação no banco ainda serão integrados.");
  }

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "28px 16px", width: "100%", color: "#202b25" }}>
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <h1 style={{ fontSize: 28, marginBottom: 10 }}>Localização da ocorrência</h1>
      <p style={{ marginBottom: 18 }}>Consulte o CEP, visualize a sugestão e clique no mapa para ajustar o marcador. Não marque residências ou endereços exatos.</p>
      <form onSubmit={(e) => { e.preventDefault(); void consultar(); }} style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <input aria-label="CEP" value={cep} onChange={(e) => setCep(e.target.value)} maxLength={9} placeholder="CEP de Votorantim" style={{ padding: 12, border: "1px solid #888", borderRadius: 6, flex: "1 1 180px", color: "#202b25", background: "white" }} />
        <button disabled={carregando || !mapaPronto} style={{ padding: "12px 20px", border: 0, borderRadius: 6, background: "#226b45", color: "white", cursor: "pointer" }}>{carregando ? "Consultando..." : "Buscar CEP"}</button>
      </form>
      <div ref={mapaEl} aria-label="Mapa interativo para seleção aproximada" style={{ height: 460, width: "100%", borderRadius: 10, background: "#e5e9e4", zIndex: 0 }} />
      <p role="status" style={{ padding: "14px 0", lineHeight: 1.5 }}>{mensagem}</p>
      {ponto && <section style={{ padding: 16, border: "1px solid #b9c6bd", borderRadius: 8 }}>
        <p><strong>Posição selecionada:</strong> {numero(ponto.lat)}, {numero(ponto.lng)}</p>
        {sugestao && <p style={{ marginTop: 6 }}>O ponto inicial foi sugerido pelo Nominatim. Ajuste-o se necessário.</p>}
        <p style={{ marginTop: 8 }}>A confirmação não publica a ocorrência nem grava dados no banco nesta versão.</p>
        <button onClick={confirmar} disabled={confirmado} style={{ marginTop: 12, padding: "10px 16px", background: "#226b45", color: "white", border: 0, borderRadius: 6, cursor: "pointer" }}>{confirmado ? "Posição confirmada" : "Confirmar posição aproximada"}</button>
      </section>}
      <p style={{ marginTop: 18, fontSize: 13 }}>Mapas e dados: © OpenStreetMap contributors. Protótipo acadêmico.</p>
    </main>
  );
}
