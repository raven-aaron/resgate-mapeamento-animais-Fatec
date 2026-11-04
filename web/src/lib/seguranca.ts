/**
 * Protege endpoints que alteram dados contra chamadas cross-origin do navegador.
 *
 * request.url pode refletir o endereço interno (ex.: 0.0.0.0:3000 no Docker).
 * Para comparar com o Origin do navegador, usamos o Host público da requisição.
 * Em produção, o proxy reverso precisa preservar/validar esse cabeçalho.
 */
export function mesmaOrigem(request: Request) {
  const origem = request.headers.get("origin");
  if (!origem) return true; // CLI/servidor sem Origin (mesmo comportamento anterior).

  const host = request.headers.get("host");
  if (!host) return false;

  try {
    const urlOrigem = new URL(origem);
    if (urlOrigem.protocol !== "http:" && urlOrigem.protocol !== "https:") return false;

    const encaminhado = request.headers.get("x-forwarded-proto")?.split(",")[0].trim().toLowerCase();
    const protocolo = encaminhado === "http" || encaminhado === "https"
      ? `${encaminhado}:`
      : new URL(request.url).protocol;

    return urlOrigem.protocol === protocolo &&
      urlOrigem.host.toLowerCase() === host.trim().toLowerCase();
  } catch {
    return false;
  }
}
