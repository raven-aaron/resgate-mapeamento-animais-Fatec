"use client";

import { useEffect, useMemo, useState } from "react";
import { listarOcorrenciasAdministrativas } from "../../lib/frontend-api";
import type { Ocorrencia } from "../../lib/tipos";
import styles from "./PainelEstatisticas.module.css";

type Periodo = "todos" | "7dias" | "30dias";
type Especie = "todos" | "cachorro" | "gato";
type Tipo = "todos" | "perdido" | "encontrado";

function dataDoEvento(valor: string) {
  const data = String(valor).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
  const [ano, mes, dia] = data.split("-").map(Number);
  const dataUtc = new Date(Date.UTC(ano, mes - 1, dia));
  if (dataUtc.getUTCFullYear() !== ano || dataUtc.getUTCMonth() !== mes - 1 || dataUtc.getUTCDate() !== dia) return null;
  return dataUtc.getTime();
}

export default function PainelEstatisticas() {
  const [periodoFiltro, setPeriodoFiltro] = useState<Periodo>("todos");
  const [especieFiltro, setEspecieFiltro] = useState<Especie>("todos");
  const [tipoFiltro, setTipoFiltro] = useState<Tipo>("todos");
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    listarOcorrenciasAdministrativas("APROVADO")
      .then(({ ocorrencias: registros }) => {
        if (ativo) setOcorrencias(registros.filter((registro) =>
          registro.status_aprovacao === "APROVADO"
        ));
      })
      .catch((error: unknown) => {
        if (ativo) setErro(error instanceof Error ? error.message : "Não foi possível carregar as estatísticas.");
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, []);

  const dadosFiltrados = useMemo(() => {
    const hoje = new Date();
    const hojeUtc = Date.UTC(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    const limiteDias = periodoFiltro === "7dias" ? 7 : periodoFiltro === "30dias" ? 30 : null;

    return ocorrencias.filter((ocorrencia) => {
      if (especieFiltro !== "todos" && ocorrencia.especie.toLocaleLowerCase("pt-BR") !== especieFiltro) return false;
      if (tipoFiltro !== "todos" && ocorrencia.tipo !== (tipoFiltro === "perdido" ? "PERDIDO" : "ENCONTRADO")) return false;
      if (limiteDias === null) return true;

      const dataEvento = dataDoEvento(ocorrencia.data);
      if (dataEvento === null) return false;
      const dias = (hojeUtc - dataEvento) / 86_400_000;
      return dias >= 0 && dias <= limiteDias;
    });
  }, [ocorrencias, periodoFiltro, especieFiltro, tipoFiltro]);

  const total = dadosFiltrados.length;
  const totalCachorros = dadosFiltrados.filter((item) => item.especie.toLocaleLowerCase("pt-BR") === "cachorro").length;
  const totalGatos = dadosFiltrados.filter((item) => item.especie.toLocaleLowerCase("pt-BR") === "gato").length;
  const totalPerdidos = dadosFiltrados.filter((item) => item.tipo === "PERDIDO" && item.status_caso === "ABERTO").length;
  const totalEncontrados = dadosFiltrados.filter((item) => item.tipo === "ENCONTRADO").length;
  const porcentagem = (valor: number) => total ? Math.round(valor / total * 100) : 0;
  const contagemBairros = dadosFiltrados.reduce<Record<string, number>>((acumulado, item) => {
    const bairro = item.bairro?.trim() || "Bairro não informado";
    acumulado[bairro] = (acumulado[bairro] || 0) + 1;
    return acumulado;
  }, {});
  const rankingBairros = Object.entries(contagemBairros).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maiorBairro = Math.max(1, ...rankingBairros.map(([, quantidade]) => quantidade));

  return (
    <div className={styles.main}>
      <div className={styles.containerFiltros}>
        <label className={styles.grupoFiltro}>
          <span>Período</span>
          <select value={periodoFiltro} onChange={(evento) => {
            const valor = evento.target.value;
            if (valor === "todos" || valor === "7dias" || valor === "30dias") setPeriodoFiltro(valor);
          }}>
            <option value="todos">Todos os registros</option>
            <option value="7dias">Últimos 7 dias</option>
            <option value="30dias">Últimos 30 dias</option>
          </select>
        </label>
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
      {carregando && <p role="status">Carregando estatísticas...</p>}
      {!carregando && !erro && <p className={styles.notaDados}>
        Indicadores calculados a partir de ocorrências aprovadas; a consulta administrativa retorna até 200 registros.
      </p>}

      <div className={styles.gridKpis}>
        <article className={styles.cardKpi}><p className={styles.valorKpi}>{total}</p><h2 className={styles.tituloKpi}>Casos aprovados</h2></article>
        <article className={styles.cardKpi}><p className={styles.valorKpi}>{totalPerdidos}</p><h2 className={styles.tituloKpi}>Perdidos ativos</h2></article>
        <article className={styles.cardKpi}><p className={styles.valorKpi}>{totalEncontrados}</p><h2 className={styles.tituloKpi}>Ocorrências de encontrados</h2></article>
      </div>

      <div className={styles.containerGraficos}>
        <section className={styles.cardGrafico}>
          <h2 className={styles.tituloGrafico}>Distribuição por espécie</h2>
          <div className={styles.linhaGrafico}>
            <div className={styles.infoLinha}><span>Cachorros</span><span>{porcentagem(totalCachorros)}% ({totalCachorros})</span></div>
            <div className={styles.barraCompleta} role="progressbar" aria-label="Percentual de cachorros" aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentagem(totalCachorros)}>
              <div className={`${styles.barraProgresso} ${styles.corLaranja}`} style={{ width: `${porcentagem(totalCachorros)}%` }} />
            </div>
          </div>
          <div className={styles.linhaGrafico}>
            <div className={styles.infoLinha}><span>Gatos</span><span>{porcentagem(totalGatos)}% ({totalGatos})</span></div>
            <div className={styles.barraCompleta} role="progressbar" aria-label="Percentual de gatos" aria-valuemin={0} aria-valuemax={100} aria-valuenow={porcentagem(totalGatos)}>
              <div className={`${styles.barraProgresso} ${styles.corVerdeAgua}`} style={{ width: `${porcentagem(totalGatos)}%` }} />
            </div>
          </div>
        </section>
        <section className={styles.cardGrafico}>
          <h2 className={styles.tituloGrafico}>Casos por região (Votorantim)</h2>
          <div className={styles.listaBairros}>
            {rankingBairros.length
              ? rankingBairros.map(([bairro, quantidade]) => (
                <div key={bairro} className={styles.itemBairro}>
                  <span className={styles.nomeBairro} title={bairro}>{bairro}</span>
                  <div className={styles.barraCompleta} role="progressbar" aria-label={`Ocorrências em ${bairro}`} aria-valuemin={0} aria-valuemax={maiorBairro} aria-valuenow={quantidade}>
                    <div className={`${styles.barraProgresso} ${styles.corVermelho}`} style={{ width: `${Math.round(quantidade / maiorBairro * 100)}%` }} />
                  </div>
                  <span className={styles.quantidadeBairro}>{quantidade}</span>
                </div>
              ))
              : <p className={styles.semResultados}>Nenhum caso nos filtros selecionados.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
