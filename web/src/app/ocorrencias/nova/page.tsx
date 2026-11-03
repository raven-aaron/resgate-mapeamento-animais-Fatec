import { Suspense } from "react";
import FormularioOcorrencia from "./FormularioOcorrencia";
export default function NovaOcorrenciaPage() {
  return <Suspense fallback={<main className="form-shell"><p>Carregando formulário...</p></main>}><FormularioOcorrencia /></Suspense>;
}
