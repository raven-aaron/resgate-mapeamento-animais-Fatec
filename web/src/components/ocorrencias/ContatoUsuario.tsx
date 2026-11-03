"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ContatoUsuario({ocorrencia}:{ocorrencia:number}){
  const router=useRouter();
  const [erro,setErro]=useState("");
  const [abrindo,setAbrindo]=useState(false);
  async function conversar(){
    setAbrindo(true);
    setErro("");
    try{
      const resposta=await fetch("/api/conversas",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({ocorrencia})});
      const dados=await resposta.json() as {id?:number;erro?:string;login?:boolean;proprietario?:boolean};
      if(resposta.status===401||dados.login){
        router.push("/login?retorno="+encodeURIComponent("/ocorrencias/"+ocorrencia));
        return;
      }
      if(!resposta.ok)throw new Error(dados.erro||"Não foi possível abrir a conversa.");
      if(!dados.id)throw new Error("Conversa inválida.");
      router.push("/mensagens/"+dados.id);
    }catch(error){setErro(error instanceof Error?error.message:"Erro ao iniciar conversa.");}
    finally{setAbrindo(false);}
  }
  return <div>
    <button type="button" className="action action-primary" disabled={abrindo} onClick={()=>void conversar()}>{abrindo?"ABRINDO CONVERSA...":"ENTRAR EM CONTATO PELO CHAT"}</button>
    {erro&&<p role="alert" className="note note-warning">{erro}</p>}
  </div>;
}
