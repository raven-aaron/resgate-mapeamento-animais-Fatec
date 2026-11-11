"use client";

import { useEffect, useState } from "react";
import MapaPublico from "../../components/ocorrencias/MapaPublico";
import { FiltroMapa } from "../../components/FiltroMapa";
import AppIcon from "../../components/AppIcon";
import { listarOcorrenciasPublicas } from "../../lib/frontend-api";
import type { Ocorrencia } from "../../lib/tipos";
import CustomButton from "../../components/CustomButton";
import styles from "./mapa.module.css";

export default function MapaPage() {
  const [modalFiltroAberto, setModalFiltroAberto] = useState(false);
  const [especie, setEspecie] = useState("");
  const [tipo, setTipo] = useState("");
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const parametros = new URLSearchParams();
    if (especie) parametros.set("especie", especie);
    if (tipo) parametros.set("tipo", tipo);
    const controlador = new AbortController();

    async function carregar() {
      setCarregando(true);
      setErro("");
      try {
        const resultado = await listarOcorrenciasPublicas(parametros.toString());
        if (!controlador.signal.aborted) setOcorrencias(resultado.ocorrencias);
      } catch (error) {
        if (!controlador.signal.aborted) {
          setErro(error instanceof Error ? error.message : "Não foi possível carregar as ocorrências.");
        }
      } finally {
        if (!controlador.signal.aborted) setCarregando(false);
      }
    }

    void carregar();
    // Mantém o mapa atualizado quando uma ocorrência é aprovada por um administrador.
    const intervalo = setInterval(() => { void carregar(); }, 20_000);
    return () => { clearInterval(intervalo); controlador.abort(); };
  }, [especie, tipo]);

  return (
    <main>
      <div className={styles.barraVisualizacao}>
        <span>Visualização: mapa</span>
        <CustomButton href="/animais" variant="green" size="small">Ver em cartazes</CustomButton>
      </div>
      <section className={styles["secao-mapa"]} aria-label="Mapa de ocorrências públicas">
        <CustomButton
          type="button"
          size="icon"
          variant="gray"
          className={styles["icone-funil-mapa"]}
          onClick={() => setModalFiltroAberto(true)}
          aria-label="Filtrar ocorrências"
        >
          <AppIcon name="filter" className="ui-icon" style={{ fontSize: "1.5em" }} />
        </CustomButton>
        <MapaPublico ocorrencias={ocorrencias} />
        <p role="status" className="sr-only">
          {erro || (carregando ? "Carregando ocorrências." : `${ocorrencias.length} ocorrências carregadas.`)}
        </p>
        {erro && <p role="alert" className="note note-warning">{erro}</p>}
        {!carregando && !erro && ocorrencias.length === 0 && (
          <p className="note note-info">Nenhuma ocorrência aprovada e aberta foi encontrada.</p>
        )}
        {!carregando && !erro && ocorrencias.length > 0 && !ocorrencias.some(
          (ocorrencia) => typeof ocorrencia.latitude === "number" && typeof ocorrencia.longitude === "number",
        ) && (
          <p className="note note-info">As ocorrências encontradas ainda não têm localização para exibir no mapa.</p>
        )}
      </section>
      {modalFiltroAberto && (
        <FiltroMapa
          especie={especie}
          status={tipo}
          onAlterarEspecie={setEspecie}
          onAlterarStatus={setTipo}
          onFechar={() => setModalFiltroAberto(false)}
        />
      )}
    </main>
  );
}
