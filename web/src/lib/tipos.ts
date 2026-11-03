export type Ocorrencia = {
  id: number;
  nome: string | null;
  especie: string;
  sexo: string;
  porte: string;
  tipo: "PERDIDO" | "ENCONTRADO";
  bairro: string;
  data: string;
  descricao: string | null;
  referencia: string | null;
  latitude: number | null;
  longitude: number | null;
  foto: string | null;
  status_aprovacao?: string;
  status_caso?: string;
};
