"use client";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, type ChangeEvent, type FormEvent } from "react";

type Registro={
  id:number;tipo:"PERDIDO"|"ENCONTRADO";status:string;
  nome:string;especie:string;sexo:string;porte:string;idade:string;microchip:string;
  raca:string;cor:string;dataEvento:string;descricao:string;referencia:string;bairro:string;cep:string;
};
export default function EditarOcorrencia({dados,racas,cores,fotosIniciais}:{dados:Registro;racas:string[];cores:string[];fotosIniciais:{id:number;url:string}[]}){
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
  const [cep,setCep]=useState(dados.cep);
  const [cepConfirmado,setCepConfirmado]=useState<string|null>(dados.cep);
  const [bairroConfirmado,setBairroConfirmado]=useState(dados.bairro);
  const [consultando,setConsultando]=useState(false);
  const [fotos,setFotos]=useState(fotosIniciais);
  const [novasFotos,setNovasFotos]=useState<File[]>([]);
  const [alterandoFotos,setAlterandoFotos]=useState(false);
  const [sucessoFoto,setSucessoFoto]=useState("");
  const [enviando,setEnviando]=useState(false);
  const [erro,setErro]=useState("");
  const hoje=new Date();
  const maxData=[hoje.getFullYear(),String(hoje.getMonth()+1).padStart(2,"0"),String(hoje.getDate()).padStart(2,"0")].join("-");
  async function consultarCep(){
    const limpo=cep.replace(/\D/g,"");
    setConsultando(true);setErro("");
    try{
      const resposta=await fetch("/api/localizacao/cep?cep="+limpo,{cache:"no-store"});
      const dados=await resposta.json() as {bairro?:string;erro?:string};
      if(!resposta.ok||!dados.bairro)throw new Error(dados.erro||"Não foi possível validar o CEP.");
      setCepConfirmado(limpo);setBairroConfirmado(dados.bairro);
    }catch(e){setCepConfirmado(null);setErro(e instanceof Error?e.message:"Falha na consulta.");}
    finally{setConsultando(false);}
  }
  function escolherFotos(evento:ChangeEvent<HTMLInputElement>){
    const selecionadas=Array.from(evento.currentTarget.files||[]);
    if(selecionadas.length+fotos.length>5||
      selecionadas.some(f=>f.size===0||f.size>5*1024*1024||!["image/jpeg","image/png","image/webp"].includes(f.type))){
      setErro("Selecione no máximo 5 fotos, em JPG, PNG ou WebP, de até 5 MB cada.");
      evento.currentTarget.value="";
      return;
    }
    setErro("");setNovasFotos(selecionadas);
  }
  async function adicionarFotos(){
    if(!novasFotos.length||alterandoFotos)return;
    setAlterandoFotos(true);setErro("");setSucessoFoto("");
    try{
      const body=new FormData();
      novasFotos.forEach(f=>body.append("fotos",f));
      const resposta=await fetch("/api/ocorrencias/"+dados.id+"/fotos",{method:"POST",body});
      const d=await resposta.json() as {erro?:string;fotos?:{id:number;url:string}[]};
      if(!resposta.ok)throw new Error(d.erro||"Falha ao adicionar fotos.");
      setFotos(d.fotos||[]);setNovasFotos([]);
      setSucessoFoto("Fotografias atualizadas. A ocorrência voltou para análise.");
      router.refresh();
    }catch(e){setErro(e instanceof Error?e.message:"Falha ao enviar fotos.");}
    finally{setAlterandoFotos(false);}
  }
  async function removerFoto(idFoto:number){
    if(alterandoFotos||!window.confirm("Remover esta fotografia da ocorrência?"))return;
    setAlterandoFotos(true);setErro("");setSucessoFoto("");
    try{
      const resposta=await fetch("/api/ocorrencias/"+dados.id+"/fotos",{
        method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({idFoto})
      });
      const d=await resposta.json() as {erro?:string;fotos?:{id:number;url:string}[]};
      if(!resposta.ok)throw new Error(d.erro||"Não foi possível remover a foto.");
      setFotos(d.fotos||[]);
      setSucessoFoto("Foto removida. O cadastro voltou para análise.");
      router.refresh();
    }catch(e){setErro(e instanceof Error?e.message:"Falha ao remover foto.");}
    finally{setAlterandoFotos(false);}
  }
  async function salvar(evento:FormEvent<HTMLFormElement>){
    evento.preventDefault();
    if(enviando)return;
    if(cep.replace(/\D/g,"")!==dados.cep&&cepConfirmado!==cep.replace(/\D/g,"")){
      setErro("Consulte o novo CEP antes de salvar as mudanças.");return;
    }
    setEnviando(true);setErro("");
    try{
      const resposta=await fetch("/api/ocorrencias/"+dados.id,{
        method:"PATCH",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({acao:"EDITAR",nome,sexo,porte,idade,microchip,raca,cor,dataEvento,descricao,referencia,
          ...(cep.replace(/\D/g,"")!==dados.cep?{cep:cepConfirmado}:{})}),
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
        <p>A espécie permanece vinculada ao cadastro original. Você pode corrigir o CEP e as fotos; qualquer alteração retorna para aprovação administrativa.</p>
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
        {dados.tipo==="PERDIDO"&&<label className="form-field">Identificação por microchip
          <select value={microchip} onChange={e=>setMicrochip(e.target.value)}>
            <option value="">Não informado</option><option value="SIM">Sim</option><option value="NAO">Não</option>
          </select>
        </label>}
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
        <div className="form-field form-field-full">
          <label htmlFor="cep-edicao">CEP da região</label>
          <input id="cep-edicao" inputMode="numeric" maxLength={9} value={cep}
            onChange={e=>{setCep(e.target.value);setCepConfirmado(null);}} placeholder="00000-000"/>
          <button type="button" className="inline-action" disabled={consultando} onClick={()=>void consultarCep()}>
            {consultando?"Consultando...":"VALIDAR NOVO CEP"}</button>
          <p role="status">Região: <strong>{bairroConfirmado}, Votorantim/SP</strong>. O ponto público é aproximado e validado no servidor.</p>
        </div>
        <label className="form-field form-field-full">Referência pública aproximada
          <input value={referencia} maxLength={255} onChange={e=>setReferencia(e.target.value)} placeholder="Ex.: próximo à praça do bairro"/>
          <small>Nunca informe número de residência, telefone ou e-mail.</small>
        </label>
        <label className="form-field form-field-full">Características e observações
          <textarea rows={5} value={descricao} maxLength={4000} onChange={e=>setDescricao(e.target.value)} placeholder="Sinais particulares, pelagem ou comportamento"/>
        </label>
      </div>
      <section className="edicao-fotos" aria-label="Gerenciar fotografias do animal">
        <h2>FOTOGRAFIAS DO ANIMAL</h2>
        <p>Adicione, substitua ou remova as imagens. O limite total é de cinco.</p>
        <div className="edicao-fotos-grid">
          {fotos.map(f=><div key={f.id} className="edicao-foto">
            <Image src={f.url} unoptimized width={135} height={112} alt={"Foto cadastrada "+f.id}/>
            <button type="button" className="inline-action" disabled={alterandoFotos}
              onClick={()=>void removerFoto(f.id)}>REMOVER FOTO</button>
          </div>)}
        </div>
        <label className="form-field">Adicionar fotos
          <input type="file" accept="image/jpeg,image/png,image/webp" multiple
            disabled={alterandoFotos||fotos.length>=5} onChange={escolherFotos}/>
        </label>
        {novasFotos.length>0&&<button type="button" className="action action-secondary"
          disabled={alterandoFotos} onClick={()=>void adicionarFotos()}>
          {alterandoFotos?"Enviando...":"ADICIONAR "+novasFotos.length+" FOTO(S)"}</button>}
        {sucessoFoto&&<p role="status" className="note">{sucessoFoto}</p>}
      </section>
      {erro&&<p className="note note-warning" role="alert">{erro}</p>}
      <div className="action-row">
        <Link href="/minhas-ocorrencias" className="action action-secondary">CANCELAR</Link>
        <button type="submit" className="action action-primary" disabled={enviando}>{enviando?"Salvando...":"SALVAR E ENVIAR PARA ANÁLISE"}</button>
      </div>
    </form>
  </main>;
}
