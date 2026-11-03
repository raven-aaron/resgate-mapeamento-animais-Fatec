import { NextRequest, NextResponse } from "next/server";

// Nominatim público: somente consultas acionadas pelo usuário, com cache e limite global
// por processo. Para múltiplas instâncias, substituir por fila/limiter compartilhado.
type ViaCep = { erro?: boolean; ibge?: string; uf?: string; bairro?: string; logradouro?: string };
type Resultado = { lat: string; lon: string; address?: { city?: string; town?: string; municipality?: string; county?: string; state?: string; country_code?: string } };
const cache = new Map<string, { expira: number; resultado: unknown; status: number }>();
let proximaConsulta = 0;
let fila: Promise<void> = Promise.resolve();

function resposta(resultado: unknown, status = 200) {
  return NextResponse.json(resultado, { status, headers: { "Cache-Control": "no-store" } });
}
function normalizar(valor: string | undefined, limite: number) {
  return (valor ?? "").normalize("NFC").replace(/\s+/g, " ").trim().slice(0, limite);
}
function simplificar(valor: string | undefined) {
  return (valor ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}
async function aguardarVez() {
  const anterior = fila;
  let liberar!: () => void;
  fila = new Promise<void>((resolve) => { liberar = resolve; });
  await anterior;
  const espera = Math.max(0, proximaConsulta - Date.now());
  if (espera) await new Promise((resolve) => setTimeout(resolve, espera));
  proximaConsulta = Date.now() + 1100;
  liberar();
}
export async function GET(request: NextRequest) {
  const cep = (request.nextUrl.searchParams.get("cep") ?? "").replace(/\D/g, "");
  if (!/^\d{8}$/.test(cep)) return resposta({ erro: "Informe um CEP com 8 dígitos." }, 400);

  const salvo = cache.get(cep);
  if (salvo && salvo.expira > Date.now()) return resposta(salvo.resultado, salvo.status);

  try {
    const cepResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      headers: { Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(6000),
    });
    if (!cepResponse.ok) return resposta({ erro: "Falha ao consultar o CEP." }, 502);
    const endereco = (await cepResponse.json()) as ViaCep;
    if (endereco.erro) return resposta({ erro: "CEP não encontrado." }, 404);
    if (endereco.ibge !== "3557006" || endereco.uf?.toUpperCase() !== "SP") {
      return resposta({ erro: "Aceitamos apenas ocorrências em Votorantim/SP." }, 422);
    }

    const logradouro = normalizar(endereco.logradouro, 160);
    const bairro = normalizar(endereco.bairro, 100);
    if (!logradouro || !bairro) {
      return resposta({ cep, logradouro: logradouro || null, bairro: bairro || null, latitude: null, longitude: null,
        origem_localizacao: null, precisao_localizacao: null, requer_confirmacao_manual: true,
        aviso: "Endereço incompleto: selecione manualmente a região aproximada no mapa." });
    }

    // O bairro do ViaCEP pode divergir dos bairros mapeados no OSM.
    // Tentar primeiro endereço completo e depois rua + município.
    async function buscar(consulta: string): Promise<Resultado[]> {
      const parametros = new URLSearchParams({
        q: consulta, format: "jsonv2", addressdetails: "1", limit: "5",
        countrycodes: "br", "accept-language": "pt-BR",
      });
      await aguardarVez();
      const respostaNominatim = await fetch(`https://nominatim.openstreetmap.org/search?${parametros}`, {
        headers: {
          "User-Agent": "ResgateMapeamentoAnimaisFatec/0.1 (projeto academico; https://github.com/raven-aaron/resgate-mapeamento-animais-Fatec)",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(9000), cache: "no-store",
      });
      if (!respostaNominatim.ok) throw new Error("Nominatim indisponível");
      return (await respostaNominatim.json()) as Resultado[];
    }
    function ehVotorantim(item: Resultado) {
      const municipio = [item.address?.city, item.address?.town, item.address?.municipality, item.address?.county];
      return item.address?.country_code === "br" &&
        municipio.some((nome) => simplificar(nome) === "votorantim") &&
        Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon));
    }
    let resultados = await buscar(`${logradouro}, ${bairro}, Votorantim, São Paulo, Brasil`);
    let correspondente = resultados.find(ehVotorantim);
    if (!correspondente) {
      resultados = await buscar(`${logradouro}, Votorantim, São Paulo, Brasil`);
      correspondente = resultados.find(ehVotorantim);
    }

    const resultado = correspondente ? {
      cep, bairro, logradouro,
      latitude: Number(correspondente.lat), longitude: Number(correspondente.lon),
      origem_localizacao: "RUA", precisao_localizacao: "RUA_APROXIMADA",
      fonte_geocodificacao: "NOMINATIM",
      requer_confirmacao_manual: true,
      aviso: "Posição aproximada sugerida. Confirme ou ajuste o pin antes de publicar; não informe número residencial.",
      atribuicao: "© OpenStreetMap contributors",
    } : {
      cep, bairro, logradouro, latitude: null, longitude: null,
      origem_localizacao: null, precisao_localizacao: null,
      requer_confirmacao_manual: true,
      aviso: "Não foi possível localizar a rua com segurança. Ajuste o pin manualmente.",
    };
    // Cache em memória reduz consultas repetidas; produção com várias réplicas exige cache compartilhado.
    if (cache.size > 500) cache.clear();
    cache.set(cep, { expira: Date.now() + 24 * 60 * 60 * 1000, resultado, status: 200 });
    return resposta(resultado);
  } catch {
    return resposta({ erro: "Serviço de localização temporariamente indisponível." }, 503);
  }
}
