"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

type Registro={
  id:number;tipo:"PERDIDO"|"ENCONTRADO";status:string;
  nome:string;especie:string;sexo:string;porte:string;idade:string;microchip:string;
  raca:string;cor:string;dataEvento:string;descricao:string;referencia:string;bairro:string;
};
export default function EditarOcorrencia({dados,racas,cores}:{dados:Registro;racas:string[];cores:string[]}){
  const router=useRouter();
  const [nome,setNome]=useState(dados.nome);
  const [sexo,setSexo]=useState(dados.sexo==="INDETERMINADO"?"":dados.sexo);
  const [porte,setPorte]=useState(dados.porte==="INDETERMINADO"?"":dados.porte);
  const [idade,setIdade]=useState(dados.idade);
  const [microchip,setMicrochip]=useState(dados.microchip);
  const [raca,setRaca]=useState(dados.raca);
  const [cor,setCor]=useState(dados.cor);
  const [dataEvento,setDataEvento]=useState(dados.dataEvento);
  const [descricao,setDescricao]=useState(dados.descricao);
  const [referencia,setReferencia]=useState(dados.referencia);
  const [enviando,setEnviando]=useState(false);
  const [erro,setErro]=useState("");
  const hoje=new Date();
  const maxData=[hoje.getFullYear(),String(hoje.getMonth()+1).padStart(2,"0"),String(hoje.getDate()).padStart(2,"0")].join("-");
  async function salvar(evento:FormEvent<HTMLFormElement>){
    evento.preventDefault();
    if(enviando)return;
    setEnviando(true);setErro("");
    try{
      const resposta=await fetch("/api/ocorrencias/"+dados.id,{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({acao:"EDITAR",nome,sexo,porte,idade,microchip,raca,cor,dataEvento,descricao,referencia}),
      });
      const resultado=await resposta.json() as {erro?:string};
      if(!resposta.ok)throw new Error(resultado.erro||"Não foi possível atualizar.");
      router.push("/minhas-ocorrencias");
      router.refresh();
    }catch(e){setErro(e instanceof Error?e.message:"Falha ao salvar.");setEnviando(false);}
  }
  return <main className="form-shell cadastro-pet">
    <header className="form-heading">
      <Link href="/minhas-ocorrencias">← Voltar às minhas ocorrências</Link>
      <span className="eyebrow">Gerenciamento da ocorrência</span>
      <h1>EDITAR CADASTRO Nº {dados.id}</h1>
      <p>Atualize as informações do animal e confira os dados antes de salvar.</p>
    </header>
    <form className="form-panel cadastro-pet-painel" onSubmit={salvar}>
      <div className="edicao-contexto">
        <strong>{dados.tipo==="PERDIDO"?"Animal perdido":"Animal encontrado"} • {dados.especie}</strong>
        <span>Região: {dados.bairro}, Votorantim/SP</span>
        <p>O CEP, a espécie e as fotografias permanecem vinculados ao cadastro original. Para corrigir a região, solicite a revisão administrativa.</p>
        <p><strong>Atenção:</strong> após editar, a ocorrência voltará para análise e ficará temporariamente fora do mapa público.</p>
      </div>
      <div className="form-grid cadastro-pet-grid">
        <label className="form-field">Nome do animal {dados.tipo==="ENCONTRADO"&&<small>Opcional</small>}
          <input value={nome} required={dados.tipo==="PERDIDO"} maxLength={80} onChange={e=>setNome(e.target.value)} />
        </label>
        <label className="form-field">Data da ocorrência
          <input type="date" value={dataEvento} max={maxData} required onChange={e=>setDataEvento(e.target.value)}/>
        </label>
        <label className="form-field">Sexo
          <select value={sexo} onChange={e=>setSexo(e.target.value)}>
            <option value="">Não informado</option><option value="MACHO">Macho</option><option value="FEMEA">Fêmea</option>
          </select>
        </label>
        <label className="form-field">Porte
          <select value={porte} onChange={e=>setPorte(e.target.value)}>
            <option value="">Não informado</option><option value="PEQUENO">Pequeno</option><option value="MEDIO">Médio</option><option value="GRANDE">Grande</option>
          </select>
        </label>
        <label className="form-field">Idade aproximada
          <input value={idade} maxLength={30} onChange={e=>setIdade(e.target.value)} placeholder="Ex.: 2 anos"/>
        </label>
        <label className="form-field">Identificação por microchip
          <select value={microchip} onChange={e=>setMicrochip(e.target.value)}>
            <option value="">Não informado</option><option value="SIM">Sim</option><option value="NAO">Não</option>
          </select>
        </label>
        <label className="form-field">Raça
          <select value={raca} onChange={e=>setRaca(e.target.value)} disabled={!racas.length}>
            <option value="">Não informada</option>
            {racas.map(x=><option value={x} key={x}>{x}</option>)}
          </select>
        </label>
        <label className="form-field">Cor predominante
          <select value={cor} onChange={e=>setCor(e.target.value)}>
            <option value="">Não informada</option>
            {cores.map(x=><option key={x} value={x}>{x}</option>)}
          </select>
        </label>
        <label className="form-field form-field-full">Referência pública aproximada
          <input value={referencia} maxLength={255} onChange={e=>setReferencia(e.target.value)} placeholder="Ex.: próximo à praça do bairro"/>
          <small>Nunca informe número de residência, telefone ou e-mail.</small>
        </label>
        <label className="form-field form-field-full">Características e observações
          <textarea rows={5} value={descricao} maxLength={4000} onChange={e=>setDescricao(e.target.value)} placeholder="Sinais particulares, pelagem ou comportamento"/>
        </label>
      </div>
      {erro&&<p className="note note-warning" role="alert">{erro}</p>}
      <div className="action-row">
        <Link href="/minhas-ocorrencias" className="action action-secondary">CANCELAR</Link>
        <button type="submit" className="action action-primary" disabled={enviando}>{enviando?"Salvando...":"SALVAR E ENVIAR PARA ANÁLISE"}</button>
      </div>
    </form>
  </main>;
}
