"use client";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Acao="SUSPENDER"|"REATIVAR"|"CONCEDER_ADMIN"|"REVOGAR_ADMIN";
export default function ControleUsuario({id,email,situacao,adminResgate,proprio}:{
  id:number;email:string;situacao:string;adminResgate:boolean;proprio:boolean;
}){
  const router=useRouter();
  const [acao,setAcao]=useState<Acao|null>(null);
  const [confirmacao,setConfirmacao]=useState("");
  const [enviando,setEnviando]=useState(false);
  const [erro,setErro]=useState("");
  const [sucesso,setSucesso]=useState("");
  if(proprio)return <small>Conta atual — alterações bloqueadas</small>;
  const opcoes: {valor:Acao;texto:string}[]=[];
  if(situacao==="ATIVO"){
    if(!adminResgate)opcoes.push({valor:"SUSPENDER",texto:"Suspender conta"});
    opcoes.push({valor:adminResgate?"REVOGAR_ADMIN":"CONCEDER_ADMIN",
      texto:adminResgate?"Remover administrador do Resgate":"Conceder acesso administrativo ao Resgate"});
  }else if(situacao==="SUSPENSO"){
    opcoes.push({valor:"REATIVAR",texto:"Reativar conta"});
  }
  async function salvar(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    if(!acao||enviando||confirmacao.trim().toLowerCase()!==email.trim().toLowerCase())return;
    setEnviando(true);setErro("");setSucesso("");
    try{
      const resposta=await fetch("/api/admin/usuarios",{
        method:"PATCH",credentials:"same-origin",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({id,acao,confirmacao}),
      });
      const dados=await resposta.json() as {erro?:string};
      if(!resposta.ok)throw new Error(dados.erro||"Não foi possível atualizar a conta.");
      setSucesso("Conta atualizada.");
      setConfirmacao("");setAcao(null);
      router.refresh();
    }catch(e){setErro(e instanceof Error?e.message:"Falha ao atualizar a conta.");}
    finally{setEnviando(false);}
  }
  if(!opcoes.length)return <small>Sem ações disponíveis</small>;
  return <details>
    <summary>Gerenciar conta</summary>
    <form onSubmit={salvar} style={{minWidth:220,paddingTop:12}}>
      <label className="form-field">Ação
        <select required value={acao||""} onChange={e=>{setAcao(e.target.value as Acao||null);setConfirmacao("");setErro("");}}>
          <option value="">Selecione a ação</option>
          {opcoes.map(o=><option key={o.valor} value={o.valor}>{o.texto}</option>)}
        </select>
      </label>
      {acao&&<>
        {acao==="SUSPENDER"&&<p style={{fontSize:12}}>A suspensão bloqueia o acesso a todos os módulos.</p>}
        <label className="form-field">Confirme digitando o e-mail completo
          <input type="email" required autoComplete="off" value={confirmacao}
            onChange={e=>setConfirmacao(e.target.value)} placeholder={email}/>
        </label>
        <button className="action action-secondary" type="submit"
          disabled={enviando||confirmacao.trim().toLowerCase()!==email.trim().toLowerCase()}>
          {enviando?"Salvando...":"CONFIRMAR ALTERAÇÃO"}
        </button>
      </>}
      {erro&&<p role="alert" className="note note-warning">{erro}</p>}
      {sucesso&&<p role="status" className="note">{sucesso}</p>}
    </form>
  </details>;
}
