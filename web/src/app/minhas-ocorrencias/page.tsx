import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { RowDataPacket } from "mysql2/promise";
import { banco } from "../../lib/db";
import { usuarioAtual } from "../../lib/auth";
export const dynamic = "force-dynamic";
type Minha = RowDataPacket & { id: number; nome: string | null; especie: string; bairro: string; tipo: string; status_aprovacao: string; status_caso: string; foto: string | null; data: string };
export default async function MinhasOcorrencias() {
  const usuario=await usuarioAtual();
  if(!usuario)redirect("/login");
  const [rows]=await banco().execute<Minha[]>(
    "SELECT o.id_ocorrencia AS id, a.nome,e.nome AS especie,b.nome AS bairro,o.tipo_ocorrencia AS tipo," +
    "o.status_aprovacao,o.status_caso,o.data_evento AS data," +
    "(SELECT f.url_foto FROM fotos_ocorrencias f WHERE f.id_ocorrencia=o.id_ocorrencia ORDER BY f.ordem LIMIT 1) AS foto " +
    "FROM ocorrencias o JOIN animais a ON a.id_animal=o.id_animal JOIN especies e ON e.id_especie=a.id_especie " +
    "JOIN bairros b ON b.id_bairro=o.id_bairro WHERE o.id_usuario_criador=? AND o.excluido_em IS NULL ORDER BY o.criado_em DESC LIMIT 100",
    [usuario.id]
  );
  return <main className="site-wrap" style={{padding:"44px 0"}}>
    <header className="form-heading">
      <span className="eyebrow">Área do cidadão</span><h1>MINHAS OCORRÊNCIAS</h1><p>Olá, {usuario.nome}. Acompanhe o status de seus registros.</p>
    </header>
    <div className="cards-ocorrencias">
      {rows.map(o=><article className="cartao-ocorrencia" key={o.id}>
        {o.foto?<Image unoptimized src={o.foto} alt={"Foto do animal "+o.id} width={340} height={210}/>:<div className="sem-foto">🐾</div>}
        <div className="corpo-cartao">
          <strong>{o.tipo==="PERDIDO"?"PERDIDO":"ENCONTRADO"}</strong>
          <h3>{o.nome||o.especie}</h3>
          <p>{o.especie} • {o.bairro} • {String(o.data).slice(0,10).split("-").reverse().join("/")}</p>
          <p><strong>Situação do cadastro:</strong> {o.status_aprovacao === "PENDENTE" ? "Em análise" : o.status_aprovacao === "APROVADO" ? "Aprovado" : o.status_aprovacao === "REJEITADO" ? "Não aprovado" : o.status_aprovacao === "OCULTO" ? "Não publicado" : o.status_aprovacao}</p>
          <p><strong>Ocorrência:</strong> {o.status_caso === "ABERTO" ? "Ativa" : o.status_caso === "RESOLVIDO" ? "Resolvida" : "Encerrada"}</p>
          {o.status_aprovacao==="APROVADO" && o.status_caso==="ABERTO" && <Link className="action action-primary" href={"/ocorrencias/"+o.id}>Ver publicação</Link>}
        </div>
      </article>)}
    </div>
    {rows.length===0 && <p className="note">Você ainda não cadastrou ocorrências.</p>}
    <div className="action-row"><Link className="action action-secondary" href="/mensagens">Minhas conversas</Link><Link href="/ocorrencias/nova" className="action action-primary">CADASTRAR ANIMAL</Link><Link href="/mapa" className="action action-secondary">Ver mapa público</Link></div>
  </main>;
}
