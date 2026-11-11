import { redirect } from "next/navigation";
import { usuarioAtual, administradorAtual } from "../../lib/auth";
import CaixaEntrada from "../../components/chat/CaixaEntrada";

export default async function MensagensPage() {
  if(!(await usuarioAtual()) && !(await administradorAtual()))redirect("/login?retorno=%2Fmensagens");
  return <CaixaEntrada />;
}
