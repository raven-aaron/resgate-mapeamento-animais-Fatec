"use client";
import { useEffect, useRef, useState } from "react";
import { carregarLeaflet, type MapaLeaflet, type MarcadorLeaflet } from "../../lib/mapa-browser";
import { criarEscalaDensidade } from "../../lib/mapa-densidade";
import styles from "./MapaCalorAdministrativo.module.css";

export type PontoCalor = {
  latitude: number;
  longitude: number;
  total: number;
  perdidos: number;
  encontrados: number;
  bairro: string;
};

type Props = { pontos?: PontoCalor[] };
type ZonaApi = Omit<PontoCalor, "bairro"> & { latitude: number | string; longitude: number | string; total: number | string; perdidos: number | string; encontrados: number | string };

export default function MapaCalorAdministrativo({ pontos }: Props) {
  const elemento = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaLeaflet | null>(null);
  const manchas = useRef<MarcadorLeaflet[]>([]);
  const enquadrouPontos = useRef(false);
  const [pontosApi, setPontosApi] = useState<PontoCalor[]>([]);
  const [pronto, setPronto] = useState(false);
  const [erroMapa, setErroMapa] = useState("");

  useEffect(() => {
    if (pontos !== undefined) return;
    const controlador = new AbortController();
    void fetch("/api/admin/mapa-termico", { signal: controlador.signal, cache: "no-store" })
      .then(async (resposta) => {
        const dados = await resposta.json() as { zonas?: ZonaApi[]; erro?: string };
        if (!resposta.ok) throw new Error(dados.erro || "Não foi possível carregar as áreas de calor.");
        return dados.zonas || [];
      })
      .then((zonas) => {
        if (controlador.signal.aborted) return;
        setPontosApi(zonas.map((zona) => ({
          latitude: Number(zona.latitude),
          longitude: Number(zona.longitude),
          total: Number(zona.total),
          perdidos: Number(zona.perdidos),
          encontrados: Number(zona.encontrados),
          bairro: "Área de ocorrências",
        })).filter((zona) => Number.isFinite(zona.latitude) && Number.isFinite(zona.longitude) && zona.total > 0));
      })
      .catch((erro: unknown) => {
        if (!controlador.signal.aborted) {
          setErroMapa(erro instanceof Error ? erro.message : "Não foi possível carregar as áreas de calor.");
        }
      });
    return () => controlador.abort();
  }, [pontos]);

  const pontosExibidos = pontos ?? pontosApi;

  useEffect(() => {
    let ativo = true;
    void carregarLeaflet().then((L) => {
      if (!ativo || !elemento.current || mapa.current) return;
      const instancia = L.map(elemento.current);
      mapa.current = instancia;
      instancia.setView([-23.5443, -47.4491], 12);
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(instancia);
      setPronto(true);
    }).catch(() => {
      if (ativo) setErroMapa("Não foi possível carregar o mapa térmico.");
    });

    return () => {
      ativo = false;
      manchas.current = [];
      mapa.current?.remove();
      mapa.current = null;
    };
  }, []);

  useEffect(() => {
    const instancia = mapa.current;
    if (!pronto || !instancia) return;
    let ativo = true;
    void carregarLeaflet().then((L) => {
      if (!ativo) return;
      manchas.current.forEach((mancha) => instancia.removeLayer(mancha));
      manchas.current = [];

      const pontosVisiveis: [number, number][] = [];
      const escala = criarEscalaDensidade(pontosExibidos.map((ponto) => ponto.total));
      for (const ponto of pontosExibidos) {
        const densidade = escala.get(ponto.total);
        if (!densidade) continue;
        const { nivel: nivelDensidade, intensidade } = densidade;
        const nivel = nivelDensidade === "alto" ? styles.nivelAlto : nivelDensidade === "medio" ? styles.nivelMedio : styles.nivelBaixo;
        const cor = nivelDensidade === "alto" ? styles.bgVermelho : nivelDensidade === "medio" ? styles.bgLaranja : styles.bgAzul;
        const tamanho = 90 + Math.round(intensidade * 50);
        const icone = L.divIcon({
          className: styles.markerIcon,
          html: `<div class="${styles.areaCalor}"><div class="${styles.manchaCalor} ${nivel}" style="--heat-opacity:${0.45 + intensidade * 0.45}"></div><span class="${styles.pontoMarcador} ${cor}"></span></div>`,
          iconSize: [tamanho, tamanho],
          iconAnchor: [tamanho / 2, tamanho / 2],
        });
        const marcador = L.marker([ponto.latitude, ponto.longitude], { icon: icone }).addTo(instancia);
        const popup = document.createElement("div");
        const titulo = document.createElement("strong");
        titulo.textContent = ponto.bairro;
        const resumo = document.createElement("p");
        resumo.textContent = `${ponto.total} ${ponto.total === 1 ? "ocorrência" : "ocorrências"}`;
        const detalhes = document.createElement("p");
        detalhes.textContent = `${ponto.perdidos} perdidos · ${ponto.encontrados} encontrados`;
        popup.append(titulo, resumo, detalhes);
        marcador.bindPopup(popup);
        manchas.current.push(marcador);
        pontosVisiveis.push([ponto.latitude, ponto.longitude]);
      }

      if (!enquadrouPontos.current && pontosVisiveis.length > 1) {
        instancia.fitBounds(pontosVisiveis, { padding: [36, 36], maxZoom: 13 });
        enquadrouPontos.current = true;
      } else if (!enquadrouPontos.current && pontosVisiveis.length === 1) {
        instancia.setView(pontosVisiveis[0], 14);
        enquadrouPontos.current = true;
      }
    }).catch(() => {
      if (ativo) setErroMapa("Não foi possível atualizar as áreas de calor.");
    });
    return () => {
      ativo = false;
    };
  }, [pontosExibidos, pronto]);

  return (
    <section>
      <div
        ref={elemento}
        className={styles.mapa}
        role="application"
        aria-label="Mapa térmico interativo de ocorrências em Votorantim. Use o mouse ou os controles para mover e aplicar zoom."
      />
      <ul className={styles.legenda} aria-label="Legenda de densidade">
        <li><span className={`${styles.amostra} ${styles.bgAzul}`} />Baixa densidade</li>
        <li><span className={`${styles.amostra} ${styles.bgLaranja}`} />Média densidade</li>
        <li><span className={`${styles.amostra} ${styles.bgVermelho}`} />Alta densidade</li>
      </ul>
      {erroMapa && <p className="note note-warning" role="alert">{erroMapa}</p>}
      {!pronto && !erroMapa && <p role="status">Carregando mapa interativo...</p>}
    </section>
  );
}
