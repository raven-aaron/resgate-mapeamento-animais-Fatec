
import "server-only";

export type LocalizacaoDoBairro = {
  cep:string;
  bairro:string;
  cidade:"Votorantim";
  uf:"SP";
  latitude:number;
  longitude:number;
  origem_localizacao:"BAIRRO";
  precisao_localizacao:"BAIRRO_APROXIMADO";
};
type ViaCep = { erro?:boolean; ibge?:string; uf?:string; bairro?:string; logradouro?:string };
type ResultadoOSM = {
  lat:string;lon:string;display_name?:string;
  address?:{
    city?:string;town?:string;municipality?:string;county?:string;
    suburb?:string;neighbourhood?:string;quarter?:string;city_district?:string;
    road?:string;country_code?:string;
  };
};
export class ErroLocalizacao extends Error {
  constructor(mensagem:string,public status:number){super(mensagem);this.name="ErroLocalizacao";}
}
const limites={sul:-23.67,norte:-23.46,oeste:-47.58,leste:-47.35};
const cacheCep=new Map<string,{ate:number;dados:LocalizacaoDoBairro}>();
const cacheBairro=new Map<string,{ate:number;lat:number;lon:number}>();
let proximaConsulta=0;
let fila:Promise<void>=Promise.resolve();

function normalizar(valor:string|undefined){
  return (valor||"").normalize("NFC").replace(/\s+/g," ").trim();
}
function chave(valor:string|undefined){
  return normalizar(valor).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
}
function dentroDoMunicipio(lat:number,lon:number){
  return Number.isFinite(lat)&&Number.isFinite(lon) &&
    lat>=limites.sul&&lat<=limites.norte&&lon>=limites.oeste&&lon<=limites.leste;
}
function coordenadaRegional(valor:number){
  // Grade pública aproximada de ~1 km; evita marcar ruas ou imóveis.
  return Math.round(valor*100)/100;
}
function correspondeMunicipio(item:ResultadoOSM){
  const a=item.address;
  const nomes=[a?.city,a?.town,a?.municipality,a?.county,item.display_name];
  return a?.country_code==="br" &&
    nomes.some(n=>chave(n).includes("votorantim")) &&
    dentroDoMunicipio(Number(item.lat),Number(item.lon));
}
function correspondeBairro(item:ResultadoOSM,bairro:string){
  const a=item.address;
  return [a?.suburb,a?.neighbourhood,a?.quarter,a?.city_district,item.display_name]
    .some(n=>chave(n).includes(chave(bairro)));
}

type BrasilApiCep = {
  city?:string;
  state?:string;
  neighborhood?:string;
  location?:{coordinates?:{latitude?:string|number;longitude?:string|number}};
};
async function consultarBrasilApi(cep:string,bairro:string){
  const resposta=await fetch("https://brasilapi.com.br/api/cep/v2/"+cep,{
    cache:"no-store",headers:{Accept:"application/json"},signal:AbortSignal.timeout(6500),
  });
  if(!resposta.ok)return null;
  const r=await resposta.json() as BrasilApiCep;
  if(chave(r.city)!=="votorantim" || r.state?.toUpperCase()!=="SP" ||
     chave(r.neighborhood)!==chave(bairro))return null;
  const lat=Number(r.location?.coordinates?.latitude);
  const lon=Number(r.location?.coordinates?.longitude);
  if(!r.location?.coordinates?.latitude || !r.location?.coordinates?.longitude ||
     !dentroDoMunicipio(lat,lon))return null;
  const ponto={lat:coordenadaRegional(lat),lon:coordenadaRegional(lon)};
  return dentroDoMunicipio(ponto.lat,ponto.lon)?ponto:null;
}

async function aguardarLimite(){
  const anterior=fila;
  let liberar!:()=>void;
  fila=new Promise<void>(resolve=>{liberar=resolve;});
  await anterior;
  const tempo=Math.max(0,proximaConsulta-Date.now());
  if(tempo)await new Promise(resolve=>setTimeout(resolve,tempo));
  proximaConsulta=Date.now()+1150;
  liberar();
}
async function buscarNoMapa(consulta:string):Promise<ResultadoOSM[]>{
  await aguardarLimite();
  const params=new URLSearchParams({
    q:consulta,format:"jsonv2",addressdetails:"1",limit:"5",
    countrycodes:"br","accept-language":"pt-BR",
    viewbox:"-47.58,-23.46,-47.35,-23.67",bounded:"1",
  });
  const r=await fetch("https://nominatim.openstreetmap.org/search?"+params.toString(),{
    headers:{
      "User-Agent":"BemEstarAnimalVotorantim/1.0 (https://github.com/raven-aaron/resgate-mapeamento-animais-Fatec)",
      Accept:"application/json",
    },cache:"no-store",signal:AbortSignal.timeout(8000),
  });
  if(!r.ok)throw new ErroLocalizacao("Não foi possível consultar a posição do bairro. Tente novamente.",503);
  return await r.json() as ResultadoOSM[];
}
export async function localizarBairroPorCep(valorCep:string):Promise<LocalizacaoDoBairro>{
  const cep=valorCep.replace(/\D/g,"");
  if(!/^\d{8}$/.test(cep))throw new ErroLocalizacao("Informe um CEP com oito dígitos.",400);
  const salvo=cacheCep.get(cep);
  if(salvo&&salvo.ate>Date.now())return salvo.dados;

  let via:ViaCep;
  try {
    const resposta=await fetch("https://viacep.com.br/ws/"+cep+"/json/",{
      cache:"no-store",headers:{Accept:"application/json"},signal:AbortSignal.timeout(7000),
    });
    if(!resposta.ok)throw new ErroLocalizacao("Não foi possível consultar o CEP agora.",503);
    via=await resposta.json() as ViaCep;
  }catch(error){
    if(error instanceof ErroLocalizacao)throw error;
    throw new ErroLocalizacao("Serviço de CEP indisponível. Tente novamente.",503);
  }
  if(via.erro)throw new ErroLocalizacao("CEP não encontrado.",404);
  if(via.ibge!=="3557006"||via.uf?.toUpperCase()!=="SP")
    throw new ErroLocalizacao("O CEP deve pertencer ao município de Votorantim/SP.",422);
  const bairro=normalizar(via.bairro).slice(0,100);
  const rua=normalizar(via.logradouro).slice(0,160);
  if(!bairro)throw new ErroLocalizacao("O CEP não identifica um bairro. Informe um CEP de rua válido.",422);

  const key=chave(bairro);
  const geocache=cacheBairro.get(key);
  let ponto=geocache&&geocache.ate>Date.now()?{lat:geocache.lat,lon:geocache.lon}:null;
  if(!ponto){
    // Primeiro procuramos a região do bairro no mapa, sem receber um ponto do usuário.
    try {
      const bairros=await buscarNoMapa(bairro+", Votorantim, São Paulo, Brasil");
      const escolhido=bairros.find(item=>correspondeMunicipio(item)&&correspondeBairro(item,bairro));
      if(escolhido){
        const lat=coordenadaRegional(Number(escolhido.lat));
        const lon=coordenadaRegional(Number(escolhido.lon));
        if(dentroDoMunicipio(lat,lon))ponto={lat,lon};
      }
    }catch {
      // Falhas pontuais no provedor não autorizam divulgar um local inventado.
    }
  }
  if(!ponto){
    // Segundo provedor independente: aceita somente o mesmo município e bairro
    // retornados pelo ViaCEP e generaliza a localização para uma grade regional.
    try{ponto=await consultarBrasilApi(cep,bairro);}catch{}
  }
  if(!ponto && rua){
    // Último recurso: localizar a via pública no mesmo município, nunca o imóvel.
    // Também é obrigatório que o provedor reconheça o bairro ou a rua consultada.
    try{
      const ruas=await buscarNoMapa(rua+", "+bairro+", Votorantim, São Paulo, Brasil");
      let escolhido=ruas.find(item=>correspondeMunicipio(item)&&(
        correspondeBairro(item,bairro)||chave(item.address?.road)===chave(rua)
      ));
      if(!escolhido){
        const simples=await buscarNoMapa(rua+", Votorantim, São Paulo, Brasil");
        escolhido=simples.find(item=>correspondeMunicipio(item)&&chave(item.address?.road)===chave(rua));
      }
      if(escolhido){
        const lat=coordenadaRegional(Number(escolhido.lat));
        const lon=coordenadaRegional(Number(escolhido.lon));
        if(dentroDoMunicipio(lat,lon))ponto={lat,lon};
      }
    }catch{}
  }
  if(!ponto)throw new ErroLocalizacao(
    "Não conseguimos confirmar a região deste CEP no mapa. Confira o CEP ou tente outro CEP do mesmo bairro.",422
  );
  if(cacheBairro.size>300)cacheBairro.clear();
  cacheBairro.set(key,{ate:Date.now()+7*24*60*60*1000,lat:ponto.lat,lon:ponto.lon});
  const dados:LocalizacaoDoBairro={
    cep,bairro,cidade:"Votorantim",uf:"SP",latitude:ponto.lat,longitude:ponto.lon,
    origem_localizacao:"BAIRRO",precisao_localizacao:"BAIRRO_APROXIMADO",
  };
  if(cacheCep.size>600)cacheCep.clear();
  cacheCep.set(cep,{ate:Date.now()+24*60*60*1000,dados});
  return dados;
}
