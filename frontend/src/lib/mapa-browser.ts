
/* Bibliotecade mapas distribuida junto com a aplicacao.
   Nao depende do carregamento de scripts de CDN e carrega apenas no navegador. */
export type MapaLeaflet = {
  setView: (posicao: [number,number], zoom: number) => MapaLeaflet;
  fitBounds: (pontos: [number,number][], opcoes?: {padding?: [number,number];maxZoom?:number}) => MapaLeaflet;
  remove: () => void;
  removeLayer: (elemento: object) => void;
};
export type MarcadorLeaflet = { addTo: (mapa: MapaLeaflet) => MarcadorLeaflet; bindPopup: (conteudo: HTMLElement, opcoes?: object) => MarcadorLeaflet };
export type Folheto = {
  map: (elemento: HTMLElement) => MapaLeaflet;
  tileLayer: (endereco: string, opcoes: { attribution:string;maxZoom:number }) => { addTo: (mapa: MapaLeaflet) => void };
  marker: (posicao:[number,number], opcoes?:{icon:object}) => MarcadorLeaflet;
  divIcon: (opcoes:{className:string;html:string;iconSize:[number,number];iconAnchor:[number,number]}) => object;
  circle: (posicao:[number,number], opcoes:{radius:number;color:string;weight:number;fillColor:string;fillOpacity:number}) => {
    addTo:(mapa:MapaLeaflet)=>{bindPopup:(conteudo:HTMLElement)=>void};
  };
};
let promessa: Promise<Folheto> | null=null;
export function carregarLeaflet():Promise<Folheto>{
  if(!promessa){
    promessa=import("leaflet").then(biblioteca=>biblioteca as unknown as Folheto).catch(erro=>{
      promessa=null;
      throw erro;
    });
  }
  return promessa;
}
