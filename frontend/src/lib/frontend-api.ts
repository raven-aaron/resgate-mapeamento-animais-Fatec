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
  const ocorrencias: Ocorrencia[] = [];
  let pagina = 1;
  // A API de moderação é paginada. Estatísticas e mapa precisam de todas as páginas.
  // Não usar apenas os 10 primeiros registros como se fossem a base inteira.
  for (;;) {
    const resultado = await solicitarApi<{ ocorrencias: Ocorrencia[]; total: number; pagina: number }>(
      `/api/admin/ocorrencias?status=${encodeURIComponent(status)}&pagina=${pagina}`,
    );
    if (!Array.isArray(resultado.ocorrencias) || !Number.isSafeInteger(resultado.total) || resultado.total < 0) {
      throw new Error("O servidor retornou uma listagem administrativa inválida.");
    }
    ocorrencias.push(...resultado.ocorrencias);
    if (ocorrencias.length >= resultado.total || resultado.ocorrencias.length === 0) break;
    if (pagina >= 1000) throw new Error("Limite de páginas administrativas excedido.");
    pagina += 1;
  }
  return { ocorrencias };
}
