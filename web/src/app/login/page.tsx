import { Suspense } from "react";
import { redirect } from "next/navigation";
import { usuarioAtual } from "../../lib/auth";
import LoginForm from "../../components/auth/LoginForm";

export const dynamic="force-dynamic";
export default async function LoginPage({searchParams}:{searchParams:Promise<{retorno?:string}>}){
  const usuario=await usuarioAtual();
  if(usuario){
    const pedido=(await searchParams).retorno||"";
    const retorno=pedido.startsWith("/")&&!pedido.startsWith("//")&&!pedido.startsWith("/\\")&&!pedido.startsWith("/admin")
      ?pedido:"/minha-conta";
    redirect(retorno);
  }
  return <Suspense fallback={<main className="form-shell"><p>Carregando acesso...</p></main>}><LoginForm/></Suspense>;
}
