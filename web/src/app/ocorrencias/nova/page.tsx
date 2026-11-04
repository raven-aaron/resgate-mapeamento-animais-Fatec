import { Suspense } from "react";
import { redirect } from "next/navigation";
import { usuarioAtual } from "../../../lib/auth";
import FormularioOcorrencia from "./FormularioOcorrencia";

export default async function NovaOcorrenciaPage({searchParams}:{searchParams:Promise<{tipo?:string}>}) {
  const parametros=await searchParams;
  if (!await usuarioAtual()) {
    const tipo=parametros.tipo==="ENCONTRADO"?"ENCONTRADO":"PERDIDO";
    redirect("/login?retorno="+encodeURIComponent("/ocorrencias/nova?tipo="+tipo));
  }
  return <Suspense fallback={<main className="form-shell"><p>Carregando formulário...</p></main>}><FormularioOcorrencia/></Suspense>;
}
