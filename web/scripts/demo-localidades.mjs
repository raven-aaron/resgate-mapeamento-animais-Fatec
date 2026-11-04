/**
 * Pontos ilustrativos para o mapa DEMO. Não são endereços ou bairros reais,
 * nem coordenadas fornecidas por usuários. Distribuídos por uma área ampliada
 * em torno de Votorantim; nunca usar para geocodificação real.
 * Este módulo é compartilhado pelo gerador inicial e pelo enriquecimento.
 */
export const PONTOS_DEMO = [
  [-23.544,-47.471],[-23.543,-47.458],[-23.540,-47.444],[-23.540,-47.430],
  [-23.552,-47.481],[-23.552,-47.466],[-23.552,-47.452],[-23.551,-47.437],[-23.551,-47.425],
  [-23.564,-47.480],[-23.565,-47.467],[-23.564,-47.454],[-23.563,-47.440],[-23.561,-47.426],
  [-23.576,-47.479],[-23.577,-47.463],[-23.578,-47.450],[-23.576,-47.435],
  [-23.588,-47.482],[-23.590,-47.466],[-23.590,-47.453],[-23.588,-47.438],[-23.586,-47.424],
  [-23.602,-47.477],[-23.603,-47.463],[-23.603,-47.447],[-23.602,-47.433],
  [-23.614,-47.469],[-23.614,-47.451],[-23.613,-47.435],
];
export function regiaoDemo(indice) {
  return indice % PONTOS_DEMO.length;
}
export function coordenadaDemo(indice) {
  if (!Number.isSafeInteger(indice) || indice < 0) throw new Error("Índice DEMO inválido");
  const ancora = PONTOS_DEMO[regiaoDemo(indice)];
  const camada = Math.floor(indice / PONTOS_DEMO.length);
  const angulo = ((indice * 137.507764) % 360) * Math.PI / 180;
  const raio = 0.00055 + camada * 0.00125;
  return [
    Number((ancora[0] + Math.sin(angulo)*raio).toFixed(6)),
    Number((ancora[1] + Math.cos(angulo)*raio).toFixed(6)),
  ];
}
