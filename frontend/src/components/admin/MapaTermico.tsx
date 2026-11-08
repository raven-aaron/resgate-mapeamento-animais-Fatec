"use client";

import { useEffect, useMemo, useState } from "react";
import { listarOcorrenciasAdministrativas, solicitarApi } from "../../lib/frontend-api";
import { criarEscalaDensidade } from "../../lib/mapa-densidade";
import type { Ocorrencia } from "../../lib/tipos";
import MapaCalorAdministrativo, { type PontoCalor } from "./MapaCalorAdministrativo";
import styles from "./MapaTermico.module.css";

type EspecieFiltro = "todos" | "cachorro" | "gato";
type TipoFiltro = "todos" | "perdido" | "encontrado";
type ZonaApi = {
  latitude: number;
  longitude: number;
  total: number;
  perdidos: number;
  encontrados: number;
};

function numeroValido(valor: unknown) {
  if (typeof valor !== "number" && typeof valor !== "string") return null;
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : null;
}

function coordenadasValidas(latitude: unknown, longitude: unknown): latitude is number {
  return typeof latitude === "number"
    && typeof longitude === "number"
    && Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}

function validarZonas(resposta: unknown) {
  if (!resposta || typeof resposta !== "object" || !("zonas" in resposta) || !Array.isArray(resposta.zonas)) {
    throw new Error("O servidor retornou dados inválidos para o mapa térmico.");
  }

  let invalidas = 0;
  const zonas = resposta.zonas.flatMap((item): ZonaApi[] => {
    if (!item || typeof item !== "object") {
      invalidas += 1;
      return [];
    }

    const dado = item as Record<string, unknown>;
    const latitude = numeroValido(dado.latitude);
    const longitude = numeroValido(dado.longitude);
    const total = numeroValido(dado.total);
    const perdidos = numeroValido(dado.perdidos);
    const encontrados = numeroValido(dado.encontrados);
    const contagensInteiras = [total, perdidos, encontrados].every((valor) =>
      valor !== null && Number.isSafeInteger(valor) && valor >= 0
    );

    if (latitude === null
      || longitude === null
      || !coordenadasValidas(latitude, longitude)
      || !contagensInteiras
      || total === null
      || perdidos === null
      || encontrados === null
      || total === 0
      || total !== perdidos + encontrados) {
      invalidas += 1;
      return [];
    }

    return [{ latitude, longitude, total, perdidos, encontrados }];
  });

  return { zonas, invalidas };
}

function chaveCoordenada(latitude: number, longitude: number) {
  return `${latitude.toFixed(2)},${longitude.toFixed(2)}`;
}

export default function MapaTermico() {
  const [especieFiltro, setEspecieFiltro] = useState<EspecieFiltro>("todos");
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>("todos");
  const [zonas, setZonas] = useState<ZonaApi[]>([]);
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [zonasInvalidas, setZonasInvalidas] = useState(0);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const controlador = new AbortController();
    let ativo = true;

    void Promise.all([
      solicitarApi<unknown>("/api/admin/mapa-termico", { signal: controlador.signal }),
      listarOcorrenciasAdministrativas("APROVADO"),
    ]).then(([respostaMapa, respostaOcorrencias]) => {
      const resultado = validarZonas(respostaMapa);
      if (ativo) {
        setZonas(resultado.zonas);
        setZonasInvalidas(resultado.invalidas);
        setOcorrencias(respostaOcorrencias.ocorrencias);
      }
    }).catch((error: unknown) => {
      if (ativo && !controlador.signal.aborted) {
        setErro(error instanceof Error ? error.message : "Não foi possível carregar o mapa térmico.");
      }
    }).finally(() => {
      if (ativo) setCarregando(false);
    });

    return () => {
      ativo = false;
      controlador.abort();
    };
  }, []);

  const ocorrenciasSemCoordenadas = ocorrencias.filter((ocorrencia) =>
    ocorrencia.status_aprovacao === "APROVADO"
    && ocorrencia.status_caso === "ABERTO"
    && !coordenadasValidas(ocorrencia.latitude, ocorrencia.longitude)
  ).length;

  const pontos = useMemo<PontoCalor[]>(() => {
    const nomePorCoordenada = new Map<string, string>();
    for (const ocorrencia of ocorrencias) {
      if (typeof ocorrencia.latitude === "number"
        && typeof ocorrencia.longitude === "number"
        && coordenadasValidas(ocorrencia.latitude, ocorrencia.longitude)
        && ocorrencia.bairro?.trim()) {
        nomePorCoordenada.set(chaveCoordenada(ocorrencia.latitude, ocorrencia.longitude), ocorrencia.bairro.trim());
      }
    }

    if (especieFiltro === "todos" && tipoFiltro === "todos") {
      return zonas.map((zona) => ({
        ...zona,
        bairro: nomePorCoordenada.get(chaveCoordenada(zona.latitude, zona.longitude)) || "Área sem bairro identificado",
      }));
    }

    const agrupados = new Map<string, PontoCalor>();
    for (const ocorrencia of ocorrencias) {
      if (ocorrencia.status_aprovacao !== "APROVADO" || ocorrencia.status_caso !== "ABERTO") continue;
      if (typeof ocorrencia.latitude !== "number"
        || typeof ocorrencia.longitude !== "number"
        || !coordenadasValidas(ocorrencia.latitude, ocorrencia.longitude)) continue;
      if (especieFiltro !== "todos" && ocorrencia.especie.toLocaleLowerCase("pt-BR") !== especieFiltro) continue;
      if (tipoFiltro !== "todos" && ocorrencia.tipo !== (tipoFiltro === "perdido" ? "PERDIDO" : "ENCONTRADO")) continue;

      const chave = chaveCoordenada(ocorrencia.latitude, ocorrencia.longitude);
      const ponto = agrupados.get(chave) || {
        latitude: ocorrencia.latitude,
        longitude: ocorrencia.longitude,
        total: 0,
        perdidos: 0,
        encontrados: 0,
        bairro: ocorrencia.bairro?.trim() || "Área sem bairro identificado",
      };
      ponto.total += 1;
      if (ocorrencia.tipo === "PERDIDO") ponto.perdidos += 1;
      else if (ocorrencia.tipo === "ENCONTRADO") ponto.encontrados += 1;
      agrupados.set(chave, ponto);
    }

    return Array.from(agrupados.values()).sort((a, b) => b.total - a.total);
  }, [especieFiltro, tipoFiltro, ocorrencias, zonas]);

  const totalPerdidos = pontos.reduce((soma, ponto) => soma + ponto.perdidos, 0);
  const totalEncontrados = pontos.reduce((soma, ponto) => soma + ponto.encontrados, 0);
  const total = pontos.reduce((soma, ponto) => soma + ponto.total, 0);
  const percentualEncontrados = total ? Math.round(totalEncontrados / total * 100) : 0;
  const maiorArea = pontos[0]?.bairro || "Nenhum registro";
  const escalaDensidade = criarEscalaDensidade(pontos.map((ponto) => ponto.total));

  return (
    <div className={styles.main}>
      <div className={styles.containerFiltros}>
        <label className={styles.grupoFiltro}>
          <span>Espécie</span>
          <select value={especieFiltro} onChange={(evento) => {
            const valor = evento.target.value;
            if (valor === "todos" || valor === "cachorro" || valor === "gato") setEspecieFiltro(valor);
          }}>
            <option value="todos">Todas as espécies</option>
            <option value="cachorro">Cachorros</option>
            <option value="gato">Gatos</option>
          </select>
        </label>
        <label className={styles.grupoFiltro}>
          <span>Tipo de ocorrência</span>
          <select value={tipoFiltro} onChange={(evento) => {
            const valor = evento.target.value;
            if (valor === "todos" || valor === "perdido" || valor === "encontrado") setTipoFiltro(valor);
          }}>
            <option value="todos">Todos os tipos</option>
            <option value="perdido">Perdidos</option>
            <option value="encontrado">Encontrados</option>
          </select>
        </label>
      </div>

      {erro && <p className="note note-warning" role="alert">{erro}</p>}
      {carregando && <p role="status">Carregando dados geográficos...</p>}
      {!carregando && !erro && <p className={styles.notaDados}>
        O mapa exibe ocorrências aprovadas e abertas usando coordenadas aproximadas. Os filtros detalhados consideram até 200 registros.
      </p>}
      {!erro && zonasInvalidas > 0 && <p className="note note-warning" role="status">
        {zonasInvalidas} área(s) com coordenadas ou contagens inválidas foram ignoradas.
      </p>}
      {!erro && ocorrenciasSemCoordenadas > 0 && <p className="note note-warning" role="status">
        {ocorrenciasSemCoordenadas} ocorrência(s) aprovadas e abertas sem coordenadas válidas não entram nos filtros do mapa.
      </p>}

      <div className={styles.conteudoPainel}>
        <section className={styles.cardMapa} aria-label="Mapa térmico interativo">
          <h2 className={styles.tituloPainel}>Zonas de ocorrência em Votorantim</h2>
          <p className={styles.subtituloPainel}>
            Arraste para navegar, use a roda do mouse ou os controles para ajustar o zoom. As cores indicam a intensidade relativa entre as áreas exibidas.
          </p>
          <MapaCalorAdministrativo pontos={pontos} />
        </section>
        <div className={styles.paineisInformacao}>
          <section className={styles.painelResumo}>
            <h2 className={styles.tituloPainel}>Resumo</h2>
            <div className={styles.gridInsights}>
              <article className={`${styles.cardInsight} ${styles.bordaVermelho}`}>
                <h3 className={styles.tituloInsight}>Área com mais ocorrências</h3>
                <p className={styles.valorInsight}>{maiorArea}</p>
              </article>
              <article className={`${styles.cardInsight} ${styles.bordaLaranja}`}>
                <h3 className={styles.tituloInsight}>Perdidos abertos</h3>
                <p className={styles.valorInsight}>{totalPerdidos} animais</p>
              </article>
              <article className={`${styles.cardInsight} ${styles.bordaVerdeAgua}`}>
                <h3 className={styles.tituloInsight}>Encontrados</h3>
                <p className={styles.valorInsight}>{percentualEncontrados}% do total</p>
              </article>
            </div>
          </section>
          <section className={styles.painelResumo}>
            <h2 className={styles.tituloPainel}>Densidade por área</h2>
            <div className={styles.listaRanking}>
              {pontos.length
                ? pontos.slice(0, 5).map((ponto) => {
                  const densidade = escalaDensidade.get(ponto.total);
                  if (!densidade) return null;
                  const cor = densidade.nivel === "alto"
                    ? styles.bgVermelho
                    : densidade.nivel === "medio"
                      ? styles.bgLaranja
                      : styles.bgAzul;
                  return <div key={`${ponto.latitude}-${ponto.longitude}`} className={styles.itemRanking}>
                    <span className={styles.nomeRanking}>{ponto.bairro}</span>
                    <span className={`${styles.badgeOcorrencias} ${cor}`}>
                      {ponto.total} {ponto.total === 1 ? "caso" : "casos"}
                    </span>
                  </div>;
                })
                : <p className={styles.semResultados}>Nenhuma ocorrência válida nos filtros selecionados.</p>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
