import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { buscarPublicaPorId } from "../../../lib/ocorrencias";
export const dynamic = "force-dynamic";
export default async function DetalheOcorrencia({params}:{params:Promise<{id:string}>}) {
  const {id}=await params;
  if(!/^[1-9]\d{0,9}$/.test(id))notFound();
  const o=await buscarPublicaPorId(Number(id));
  if(!o)notFound();
  return <main className="form-shell">
    <header className="form-heading"><Link href="/mapa">← Voltar aos animais</Link><h1>{o.tipo==="PERDIDO"?"PROCURA-SE":"ANIMAL ENCONTRADO"}</h1></header>
    <article className="form-panel">
      {o.foto ? <Image unoptimized src={o.foto} alt={"Foto do animal "+o.id} width={700} height={400} style={{width:"100%",height:"auto",maxHeight:420,objectFit:"cover",borderRadius:12}}/> : <div className="sem-foto">🐾</div>}
      <h2 style={{marginTop:24}}>{o.nome || o.especie}</h2>
      <dl className="review-list">
        <div><dt>Espécie</dt><dd>{o.especie}</dd></div>
        <div><dt>Tipo de ocorrência</dt><dd>{o.tipo==="PERDIDO"?"Perdido":"Encontrado"}</dd></div>
        <div><dt>Porte</dt><dd>{o.porte==="INDETERMINADO"?"Não informado":o.porte.toLowerCase()}</dd></div>
        <div><dt>Sexo</dt><dd>{o.sexo==="INDETERMINADO"?"Não informado":o.sexo.toLowerCase()}</dd></div>
        <div><dt>Bairro</dt><dd>{o.bairro}, Votorantim/SP</dd></div>
        <div><dt>Data</dt><dd>{String(o.data).slice(0,10).split("-").reverse().join("/")}</dd></div>
      </dl>
      {o.referencia && <p><strong>Referência:</strong> {o.referencia}</p>}
      {o.descricao && <p><strong>Observações:</strong> {o.descricao}</p>}
      <p className="note">Localização pública aproximada, nunca um endereço residencial. O contato entre cidadãos será realizado por chat interno após sua implementação.</p>
    </article>
  </main>;
}
