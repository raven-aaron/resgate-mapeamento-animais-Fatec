import Link from "next/link";
import { notFound } from "next/navigation";

const servicos: Record<string, { nome: string; texto: string }> = {
  "vacinas": { nome: "Vacinas", texto: "Serviço em preparação." },
  "adocao": { nome: "Adoção", texto: "Serviço em preparação." },
  "banco-de-racao": { nome: "Banco de Ração", texto: "Serviço em preparação." },
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
        <div className="action-row"><Link className="action action-secondary" href="/">Voltar ao início</Link></div>
      </section>
    </main>
  );
}
