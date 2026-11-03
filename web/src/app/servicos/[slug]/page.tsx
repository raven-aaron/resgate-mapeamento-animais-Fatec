import Link from "next/link";
import { notFound } from "next/navigation";

const servicos: Record<string, { nome: string; texto: string }> = {
  "vacinas": { nome: "Vacinas", texto: "Área reservada às informações e aos serviços municipais de vacinação animal." },
  "adocao": { nome: "Adoção", texto: "Área reservada às informações sobre adoção responsável e acolhimento de animais." },
  "banco-de-racao": { nome: "Banco de Ração", texto: "Área reservada ao módulo municipal de Banco de Ração." },
};

export function generateStaticParams() {
  return Object.keys(servicos).map(slug => ({ slug }));
}

export default async function ServicoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const servico = servicos[slug];
  if (!servico) notFound();
  return (
    <main className="site-wrap" style={{padding:"60px 0"}}>
      <span className="eyebrow">Serviços municipais</span>
      <h1 style={{color:"var(--cor-verde-agua)",fontSize:"clamp(30px,5vw,44px)",margin:"14px 0"}}>{servico.nome}</h1>
      <section className="card" style={{maxWidth:780}}>
        <p style={{fontSize:17,lineHeight:1.7}}>{servico.texto}</p>
        <p>Informações detalhadas deste serviço ainda não estão disponíveis nesta página. Para orientações, utilize os canais de atendimento responsáveis.</p>
        <div className="action-row"><Link className="action action-secondary" href="/">Voltar ao início</Link></div>
      </section>
    </main>
  );
}
