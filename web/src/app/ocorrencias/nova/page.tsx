import { Suspense } from "react";
import { redirect } from "next/navigation";
import FormularioOcorrencia from "../../../components/ocorrencias/FormularioOcorrencia";
import { usuarioAtual } from "../../../lib/auth";

type Props = {
  searchParams: Promise<{ tipo?: string }>;
};

export default async function NovaOcorrenciaPage({ searchParams }: Props) {
  const parametros = await searchParams;
  const usuario = await usuarioAtual();

  if (!usuario) {
    const tipo = parametros.tipo === "ENCONTRADO" ? "ENCONTRADO" : "PERDIDO";
    redirect("/login?retorno=" + encodeURIComponent("/ocorrencias/nova?tipo=" + tipo));
  }

  return (
    <Suspense
      fallback={
        <main className="form-shell">
          <p>Carregando formulário...</p>
        </main>
      }
    >
      <FormularioOcorrencia />
    </Suspense>
  );
}
