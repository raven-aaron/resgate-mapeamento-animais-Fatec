import { redirect } from "next/navigation";
import { usuarioAtual } from "../../lib/auth";
import PainelNotificacoes from "../../components/notificacoes/PainelNotificacoes";
export const dynamic="force-dynamic";
export default async function NotificacoesPage(){
  if(!await usuarioAtual())redirect("/login?retorno=%2Fnotificacoes");
  return <PainelNotificacoes/>;
}
