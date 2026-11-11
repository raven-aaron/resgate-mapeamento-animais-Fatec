export function identificacaoAnimal(tipo: "PERDIDO" | "ENCONTRADO", nome: string | null | undefined, especie: string) {
  return tipo === "PERDIDO" ? nome?.trim() || especie : "Animal encontrado";
}
