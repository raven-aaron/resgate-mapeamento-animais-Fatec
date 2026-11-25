import Image from "next/image";
import { redirect } from "next/navigation";
import AcoesMinhaOcorrencia from "../../components/ocorrencias/AcoesMinhaOcorrencia";
import CustomButton from "../../components/CustomButton";
import { listarMinhasOcorrencias } from "../../models/ocorrencias";
import { usuarioAtual } from "../../lib/auth";
import { identificacaoAnimal } from "../../lib/identificacao-animal";
export const dynamic = "force-dynamic";
export default async function MinhasOcorrencias() {
  const usuario=await usuarioAtual();
  if(!usuario)redirect("/login");
  const rows = await listarMinhasOcorrencias(usuario.id);
  return <main className="site-wrap" style={{padding:"44px 0"}}>
    <header className="form-heading">
      <span className="eyebrow">Área do cidadão</span><h1>MINHAS OCORRÊNCIAS</h1><p>Olá, {usuario.nome}.</p>
    </header>
    <div className="cards-ocorrencias">
      {rows.map(o=><article className="cartao-ocorrencia" key={o.id}>
        {o.foto?<Image unoptimized src={o.foto} alt={"Foto do animal "+o.id} width={340} height={210}/>:<div className="sem-foto">🐾</div>}
        <div className="corpo-cartao">
          <strong>{o.tipo==="PERDIDO"?"PERDIDO":"ENCONTRADO"}</strong>
          <h3>{identificacaoAnimal(o.tipo,o.nome,o.especie)}</h3>
          <p>{o.especie} • {o.bairro} • {String(o.data).slice(0,10).split("-").reverse().join("/")}</p>
          <p><strong>Situação do cadastro:</strong> {o.status_aprovacao === "PENDENTE" ? "Em análise" : o.status_aprovacao === "APROVADO" ? "Aprovado" : o.status_aprovacao === "REJEITADO" ? "Não aprovado" : o.status_aprovacao === "OCULTO" ? "Não publicado" : o.status_aprovacao}</p>
          {o.status_aprovacao==="REJEITADO"&&<p className="note note-warning" role="status"><strong>Motivo da rejeição:</strong> {o.motivo_rejeicao||"Consulte a administração para obter detalhes."}</p>}
          <p><strong>Ocorrência:</strong> {o.status_caso === "ABERTO" ? "Ativa" : o.status_caso === "RESOLVIDO" ? "Resolvida" : "Encerrada"}</p>
          {o.status_aprovacao==="APROVADO" && o.status_caso==="ABERTO" && <CustomButton href={"/ocorrencias/"+o.id} variant="green">Ver publicação</CustomButton>}
          <AcoesMinhaOcorrencia id={o.id} tipo={o.tipo} statusAprovacao={o.status_aprovacao} statusCaso={o.status_caso}/>
        </div>
      </article>)}
    </div>
    {rows.length===0 && <p className="note">Você ainda não cadastrou ocorrências.</p>}
    <div className="action-row"><CustomButton href="/mensagens" variant="gray">Minhas conversas</CustomButton><CustomButton href="/ocorrencias/nova" variant="green">CADASTRAR ANIMAL</CustomButton><CustomButton href="/mapa" variant="gray">Ver mapa público</CustomButton></div>
  </main>;
}
