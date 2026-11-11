"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import CustomButton from "../CustomButton";
type Acao="ENCERRAR"|"EXCLUIR";
export default function AcoesMinhaOcorrencia({
  id,tipo,statusAprovacao,statusCaso
}:{
  id:number;tipo:string;statusAprovacao:string;statusCaso:string;
}){
  const router=useRouter();
  const [acao,setAcao]=useState<Acao|null>(null);
  const motivoPadrao=tipo==="PERDIDO"?"REENCONTRADO":"DEVOLVIDO_AO_TUTOR";
  const [motivo,setMotivo]=useState(motivoPadrao);
  const [detalhe,setDetalhe]=useState("");
  const [enviando,setEnviando]=useState(false);
  const [erro,setErro]=useState("");
  const [sucesso,setSucesso]=useState("");
  const aberto=statusCaso==="ABERTO";
  const editavel=aberto&&["PENDENTE","REJEITADO","APROVADO"].includes(statusAprovacao);
  async function confirmar(){
    if(!acao||enviando)return;
    setEnviando(true);setErro("");setSucesso("");
    try{
      const resposta=await fetch("/api/ocorrencias/"+id,{
        method:acao==="EXCLUIR"?"DELETE":"PATCH",
        ...(acao==="ENCERRAR"?{
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({acao:"ENCERRAR",motivo,detalhe})
        }:{})
      });
      const dados=await resposta.json() as {erro?:string;mensagem?:string};
      if(!resposta.ok)throw new Error(dados.erro||"Não foi possível atualizar a ocorrência.");
      setAcao(null);setSucesso(dados.mensagem||"Alteração concluída.");
      router.refresh();
    }catch(e){
      setErro(e instanceof Error?e.message:"Erro ao atualizar a ocorrência.");
    }finally{setEnviando(false);}
  }
  return <div className="meus-controles">
    <div className="meus-controles-botoes">
      {editavel&&<CustomButton href={"/minhas-ocorrencias/"+id+"/editar"} size="small">{statusAprovacao==="REJEITADO"?"CORRIGIR E REENVIAR":"EDITAR DADOS"}</CustomButton>}
      {aberto&&<CustomButton size="small" variant="green" type="button" onClick={()=>{
        setAcao("ENCERRAR");setMotivo(motivoPadrao);setDetalhe("");setErro("");
      }}>MARCAR COMO RESOLVIDA</CustomButton>}
      <CustomButton type="button" size="small" variant="red" onClick={()=>{
        setAcao("EXCLUIR");setErro("");
      }}>EXCLUIR CADASTRO</CustomButton>
    </div>
    {sucesso&&<p className="note" role="status">{sucesso}</p>}
    {erro&&!acao&&<p role="alert" className="note note-warning">{erro}</p>}
    {acao&&<div className="admin-modal-fundo" role="presentation">
      <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby={"gerenciar-"+id}>
        <h2 id={"gerenciar-"+id}>{acao==="EXCLUIR"?"Excluir ocorrência":"Encerrar ocorrência"}</h2>
        {acao==="EXCLUIR"?<p>A ocorrência será excluída da listagem. Esta ação não pode ser desfeita.</p>:<>
          <p>A ocorrência sairá das buscas. As conversas anteriores permanecerão disponíveis.</p>
          <label className="form-field">Motivo do encerramento
            <select value={motivo} onChange={e=>setMotivo(e.target.value)}>
              <option value={motivoPadrao}>{tipo==="PERDIDO"?"Animal reencontrado":"Devolvido ao tutor"}</option>
              <option value="DUPLICIDADE">Cadastro duplicado</option>
              <option value="OUTRO">Outro motivo</option>
            </select>
          </label>
          {motivo==="OUTRO"&&<label className="form-field">Informe o motivo
            <textarea required minLength={5} maxLength={500} value={detalhe} onChange={e=>setDetalhe(e.target.value)} rows={3}/>
          </label>}
        </>}
        {erro&&<p className="note note-warning" role="alert">{erro}</p>}
        <div className="action-row">
          <CustomButton type="button" variant="gray" disabled={enviando} onClick={()=>{setAcao(null);setErro("");}} autoFocus>CANCELAR</CustomButton>
          <CustomButton type="button" variant={acao==="EXCLUIR"?"red":"green"} onClick={()=>void confirmar()} disabled={enviando||(acao==="ENCERRAR"&&motivo==="OUTRO"&&detalhe.trim().length<5)}>
            {enviando?"Salvando...":acao==="EXCLUIR"?"CONFIRMAR EXCLUSÃO":"CONFIRMAR ENCERRAMENTO"}
          </CustomButton>
        </div>
      </section>
    </div>}
  </div>;
}
