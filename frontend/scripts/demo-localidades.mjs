/** Bairro e CEP de logradouro VERIFICÁVEIS de Votorantim/SP — SOMENTE seed DEMO.
 * Coordenadas de referência do OpenStreetMap (Mapcarta), não geolocalização
 * exata do CEP, imóvel ou animal. Nunca usar para validar cadastros reais.
 * O CEP representa um logradouro existente no bairro, não a ocorrência.
 */
export const BAIRROS_DEMO=Object.freeze([
  {nome:"Jardim Novo Mundo",cep:"18119016",latitude:-23.53889,longitude:-47.50336,fonteCep:"https://cepbrasil.com/sp/votorantim/jardim-novo-mundo",fonteMapa:"https://mapcarta.com/N7034806738"},
  {nome:"Jardim Tatiana",cep:"18119153",latitude:-23.54191,longitude:-47.49141,fonteCep:"https://cepbrasil.com/sp/votorantim/jardim-tatiana",fonteMapa:"https://mapcarta.com/N7034813853"},
  {nome:"Parque Santa Márcia",cep:"18119256",latitude:-23.55216,longitude:-47.47257,fonteCep:"https://cepbrasil.com/sp/votorantim/parque-santa-marcia",fonteMapa:"https://mapcarta.com/N8323127939"},
  {nome:"Jardim Karolyne",cep:"18110656",latitude:-23.55074,longitude:-47.46712,fonteCep:"https://cepbrasil.com/sp/votorantim/jardim-karolyne",fonteMapa:"https://mapcarta.com/N8329277641"},
  {nome:"Parque Bela Vista",cep:"18110560",latitude:-23.54374,longitude:-47.45992,fonteCep:"https://cepbrasil.com/sp/votorantim/parque-bela-vista",fonteMapa:"https://mapcarta.com/N8329245326"},
  {nome:"Jardim Icatu",cep:"18110210",latitude:-23.53973,longitude:-47.45449,fonteCep:"https://cepbrasil.com/sp/votorantim/jardim-icatu",fonteMapa:"https://mapcarta.com/N8329247678"},
  {nome:"Vossoroca",cep:"18116000",latitude:-23.54791,longitude:-47.45099,fonteCep:"https://cepbrasil.com/sp/votorantim/vossoroca",fonteMapa:"https://mapcarta.com/N8329263828"},
  {nome:"Vila Votocel",cep:"18115330",latitude:-23.55437,longitude:-47.44109,fonteCep:"https://cepbrasil.com/sp/votorantim/vila-votocel",fonteMapa:"https://mapcarta.com/N8322891955"},
  {nome:"Parque São João",cep:"18115750",latitude:-23.57151,longitude:-47.45378,fonteCep:"https://cepbrasil.com/sp/votorantim/parque-sao-joao",fonteMapa:"https://mapcarta.com/N8326009474"},
  {nome:"Parque Jataí",cep:"18117330",latitude:-23.57132,longitude:-47.46313,fonteCep:"https://cepbrasil.com/sp/votorantim/parque-jatai",fonteMapa:"https://mapcarta.com/N8325593927"},
  {nome:"Vila Pardini",cep:"18117495",latitude:-23.57359,longitude:-47.46407,fonteCep:"https://cepbrasil.com/sp/votorantim/vila-pardini",fonteMapa:"https://mapcarta.com/N8325306415"},
  {nome:"Jardim Ana Cláudia",cep:"18112570",latitude:-23.53162,longitude:-47.43203,fonteCep:"https://cepbrasil.com/sp/votorantim/jardim-ana-claudia",fonteMapa:"https://mapcarta.com/N8322030957"},
  {nome:"Jardim Residencial Chácara Ondina",cep:"18112671",latitude:-23.53377,longitude:-47.43087,fonteCep:"https://cepbrasil.com/sp/votorantim/jardim-residencial-chacara-ondina",fonteMapa:"https://mapcarta.com/N8322096405"},
  {nome:"Barra Funda",cep:"18114350",latitude:-23.54593,longitude:-47.43237,fonteCep:"https://cepbrasil.com/sp/votorantim/barra-funda",fonteMapa:"https://mapcarta.com/N8329286387"},
  {nome:"Vila Irineu",cep:"18114600",latitude:-23.54311,longitude:-47.42667,fonteCep:"https://cepbrasil.com/sp/votorantim/vila-irineu",fonteMapa:"https://mapcarta.com/N8329259600"},
]);
export const PONTOS_DEMO=BAIRROS_DEMO.map(({latitude,longitude})=>[latitude,longitude]);
export function regiaoDemo(indice){
  if(!Number.isSafeInteger(indice)||indice<0)throw new Error("Índice DEMO inválido");
  return indice%BAIRROS_DEMO.length;
}
export function coordenadaDemo(indice){
  const bairro=BAIRROS_DEMO[regiaoDemo(indice)];
  const camada=Math.floor(indice/BAIRROS_DEMO.length);
  const angulo=((indice*137.507764)%360)*Math.PI/180;
  const raio=0.00017+Math.min(camada,6)*0.00010;
  return [
    Number((bairro.latitude+Math.sin(angulo)*raio).toFixed(6)),
    Number((bairro.longitude+Math.cos(angulo)*raio).toFixed(6)),
  ];
}
