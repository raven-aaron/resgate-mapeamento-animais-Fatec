import { redirect } from "next/navigation";
import { usuarioAtual } from "../../lib/auth";
import CaixaEntrada from "../../components/chat/CaixaEntrada";

export default async function MensagensPage() {
  if(!await usuarioAtual())redirect("/login?retorno=%2Fmensagens");
  return <CaixaEntrada />;
}
