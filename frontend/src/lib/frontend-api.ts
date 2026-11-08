import type { Ocorrencia } from "./tipos";

type RespostaErro = { erro?: string };

export class ErroApi extends Error {
  constructor(mensagem: string, readonly status: number) {
    super(mensagem);
    this.name = "ErroApi";
  }
}

export async function solicitarApi<T>(url: string, init?: RequestInit): Promise<T> {
  const resposta = await fetch(url, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
  });

  let dados: T | RespostaErro;
  try {
    dados = await resposta.json() as T | RespostaErro;
  } catch {
    throw new Error("O servidor retornou uma resposta inválida.");
  }

  if (!resposta.ok) {
    const erro = dados && typeof dados === "object" && "erro" in dados && typeof dados.erro === "string"
      ? dados.erro
      : "Não foi possível concluir a solicitação.";
    throw new ErroApi(erro, resposta.status);
  }

  return dados as T;
}

export async function listarOcorrenciasPublicas(filtros = "") {
  const query = filtros ? `?${filtros}` : "";
  return solicitarApi<{ ocorrencias: Ocorrencia[] }>("/api/ocorrencias" + query);
}

export async function listarOcorrenciasAdministrativas(status = "TODAS") {
  return solicitarApi<{ ocorrencias: Ocorrencia[] }>(
    `/api/admin/ocorrencias?status=${encodeURIComponent(status)}`,
  );
}
