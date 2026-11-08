type LocalizacaoCep = {
  cep: string;
  bairro: string;
  latitude: number;
  longitude: number;
  aviso: string;
};

export async function buscarEnderecoPorCep(cep: string): Promise<LocalizacaoCep> {
  const cepLimpo = cep.replace(/\D/g, "");
  if (cepLimpo.length !== 8) throw new Error("Informe um CEP válido com 8 dígitos.");

  const resposta = await fetch(`/api/localizacao/cep?cep=${encodeURIComponent(cepLimpo)}`, { cache: "no-store" });
  const dados: unknown = await resposta.json();
  if (!resposta.ok) {
    const erro = dados && typeof dados === "object" && "erro" in dados && typeof dados.erro === "string"
      ? dados.erro
      : "Não foi possível consultar o CEP.";
    throw new Error(erro);
  }
  if (!dados || typeof dados !== "object" ||
    !("cep" in dados) || typeof dados.cep !== "string" ||
    !("bairro" in dados) || typeof dados.bairro !== "string" ||
    !("latitude" in dados) || typeof dados.latitude !== "number" ||
    !("longitude" in dados) || typeof dados.longitude !== "number" ||
    !("aviso" in dados) || typeof dados.aviso !== "string") {
    throw new Error("O servidor retornou uma localização inválida.");
  }
  return {
    cep: dados.cep,
    bairro: dados.bairro,
    latitude: dados.latitude,
    longitude: dados.longitude,
    aviso: dados.aviso,
  };
}