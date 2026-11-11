const situacoesPermitidas = new Set([
  "PODE_ACOLHER",
  "NAO_PODE_ACOLHER",
]);

/**
 * @param {unknown} tipo
 * @param {unknown} valor
 * @returns {"PODE_ACOLHER" | "NAO_PODE_ACOLHER" | null | undefined}
 */
export function validarSituacaoLarTemporario(tipo, valor) {
  if (tipo === "PERDIDO") {
    return valor === undefined || valor === null || valor === "" ? null : undefined;
  }
  if (tipo === "ENCONTRADO" && typeof valor === "string" && situacoesPermitidas.has(valor)) {
    return valor;
  }
  return undefined;
}
