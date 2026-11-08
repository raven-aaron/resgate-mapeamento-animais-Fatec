export type NivelDensidade = "baixo" | "medio" | "alto";
export type DensidadeNormalizada = {
  intensidade: number;
  nivel: NivelDensidade;
};
export type EscalaDensidade = Map<number, DensidadeNormalizada>;

export function criarEscalaDensidade(totais: number[]): EscalaDensidade {
  const valores = [...new Set(totais.filter((total) => Number.isFinite(total) && total > 0))];
  if (valores.length === 0) return new Map();

  const minimo = Math.min(...valores);
  const maximo = Math.max(...valores);
  const escala = new Map<number, DensidadeNormalizada>();

  for (const valor of valores) {
    const intensidade = minimo === maximo ? 0 : (valor - minimo) / (maximo - minimo);
    const nivel: NivelDensidade = intensidade <= 0.33
      ? "baixo"
      : intensidade <= 0.66
        ? "medio"
        : "alto";
    escala.set(valor, { intensidade, nivel });
  }

  return escala;
}
