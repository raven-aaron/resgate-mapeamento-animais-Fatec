import { redirect,notFound } from "next/navigation";
import { usuarioAtual } from "../../../lib/auth";
import SalaConversa from "../../../components/chat/SalaConversa";

export default async function ConversaPage({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  if(!/^[1-9]\d{0,9}$/.test(id))notFound();
  if(!await usuarioAtual())redirect("/login?retorno="+encodeURIComponent("/mensagens/"+id));
  return <SalaConversa id={Number(id)}/>;
}
