"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CustomButton from "../CustomButton";

export default function ContatoUsuario({ocorrencia}:{ocorrencia:number}){
  const router=useRouter();
  const [erro,setErro]=useState("");
  const [abrindo,setAbrindo]=useState(false);
  async function conversar(){
    setAbrindo(true);
    setErro("");
    try{
      const resposta=await fetch("/api/conversas",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ocorrencia})});
      const dados=await resposta.json() as {id?:unknown;erro?:string;login?:boolean;proprietario?:boolean};
      if(resposta.status===401||dados.login){
        router.push("/login?retorno="+encodeURIComponent("/ocorrencias/"+ocorrencia));
        return;
      }
      if(!resposta.ok)throw new Error(dados.erro||"Não foi possível abrir a conversa.");
      const idConversa=Number(dados.id);
      if(!Number.isSafeInteger(idConversa)||idConversa<1)throw new Error("Conversa inválida.");
      router.push("/mensagens/"+idConversa);
    }catch(error){setErro(error instanceof Error?error.message:"Erro ao iniciar conversa.");}
    finally{setAbrindo(false);}
  }
  return <div>
    <CustomButton type="button" variant="green" disabled={abrindo} onClick={()=>void conversar()}>{abrindo?"ABRINDO CONVERSA...":"ENTRAR EM CONTATO PELO CHAT"}</CustomButton>
    {erro&&<p role="alert" className="note note-warning">{erro}</p>}
  </div>;
}
