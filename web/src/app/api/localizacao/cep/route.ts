import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type ViaCep = {
  erro?: boolean | string;
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  ibge?: string;
};

function limpar(texto: string | undefined, limite: number): string {
  return (texto ?? "").normalize("NFC").replace(/\\s+/g, " ").trim().slice(0, limite);
}

export async function GET(request: NextRequest) {
  const cep = request.nextUrl.searchParams.get("cep")?.replace(/\\D/g, "") ?? "";
  if (!/^\\d{8}$/.test(cep)) {
    return NextResponse.json({ erro: "Informe um CEP com 8 dígitos." }, { status: 400 });
  }

  try {
    const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!resposta.ok) {
      return NextResponse.json({ erro: "Não foi possível consultar o CEP." }, { status: 502 });
    }
    const dados = (await resposta.json()) as ViaCep;
    if (dados.erro) {
      return NextResponse.json({ erro: "CEP não encontrado." }, { status: 404 });
    }
    if (dados.ibge !== "3557006" || dados.uf?.toUpperCase() !== "SP") {
      return NextResponse.json({ erro: "Aceitamos apenas ocorrências em Votorantim/SP." }, { status: 422 });
    }
    const bairro = limpar(dados.bairro, 100);
    const logradouro = limpar(dados.logradouro, 160);
    return NextResponse.json({
      cep,
      cidade: "Votorantim",
      uf: "SP",
      codigo_ibge: "3557006",
      bairro: bairro || null,
      logradouro: logradouro || null,
      requer_confirmacao_manual: !bairro || !logradouro,
      // ViaCEP não devolve coordenadas. Nunca inventar um pin.
      latitude: null,
      longitude: null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ erro: "Serviço de CEP temporariamente indisponível." }, { status: 503 });
  }
}
