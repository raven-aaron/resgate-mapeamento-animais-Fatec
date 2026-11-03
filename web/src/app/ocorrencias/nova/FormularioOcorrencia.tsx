"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";

type Tipo = "PERDIDO" | "ENCONTRADO";
type Endereco = { bairro: string | null; logradouro: string | null; cidade: string; uf: string; cep: string };
type ViaCepResposta = Endereco & { erro?: string };

const especies = ["Cachorro", "Gato", "Outro"];
const cores = ["", "Preta", "Branca", "Marrom", "Caramelo", "Cinza", "Amarela", "Laranja", "Outra"];

export default function FormularioOcorrencia() {
  const parametros = useSearchParams();
  const [tipo, setTipo] = useState<Tipo>(parametros.get("tipo") === "ENCONTRADO" ? "ENCONTRADO" : "PERDIDO");
  const [especie, setEspecie] = useState("");
  const [nome, setNome] = useState("");
  const [sexo, setSexo] = useState("INDETERMINADO");
  const [porte, setPorte] = useState("INDETERMINADO");
  const [cor, setCor] = useState("");
  const [idade, setIdade] = useState("");
  const [microchip, setMicrochip] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cep, setCep] = useState("");
  const [referencia, setReferencia] = useState("");
  const [endereco, setEndereco] = useState<Endereco | null>(null);
  const [consultaCep, setConsultaCep] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [revisao, setRevisao] = useState(false);

  async function buscarCep() {
    const limpo = cep.replace(/\D/g, "");
    setEndereco(null);
    setRevisao(false);
    if (!/^\d{8}$/.test(limpo)) {
      setConsultaCep("Informe um CEP com oito dígitos.");
      return;
    }
    setConsultando(true);
    setConsultaCep("");
    try {
      const resposta = await fetch(`/api/localizacao/cep?cep=${limpo}`, { cache: "no-store" });
      const dados = await resposta.json() as ViaCepResposta;
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível consultar o CEP.");
      setEndereco({ bairro: dados.bairro, logradouro: dados.logradouro, cidade: dados.cidade, uf: dados.uf, cep: limpo });
      setConsultaCep("CEP validado para Votorantim/SP.");
    } catch (error) {
      setConsultaCep(error instanceof Error ? error.message : "Erro ao consultar o CEP.");
    } finally {
      setConsultando(false);
    }
  }

  function revisar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!endereco || endereco.cep !== cep.replace(/\D/g, "")) {
      setConsultaCep("Consulte e valide o CEP antes de revisar os dados.");
      return;
    }
    setRevisao(true);
  }

  return (
    <main className="form-shell">
      <header className="form-heading">
        <Link href="/" style={{color:"var(--brand)", fontSize:13, fontWeight:700}}>← Voltar ao início</Link>
        <span className="eyebrow" style={{display:"block",marginTop:23}}>Novo registro</span>
        <h1>Cadastrar ocorrência</h1>
        <p>Estamos construindo o formulário de registro. Nesta etapa já é possível preencher os dados, validar o CEP e revisar as informações; a gravação no MySQL ainda será integrada.</p>
      </header>
      <form onSubmit={revisar}>
        <section className="form-panel">
          <h2>1. Tipo de ocorrência</h2>
          <div className="form-grid">
            <label className="form-field">O que aconteceu?
              <select value={tipo} onChange={e => { setTipo(e.target.value as Tipo); setRevisao(false); }}>
                <option value="PERDIDO">Perdi um animal</option>
                <option value="ENCONTRADO">Encontrei um animal</option>
              </select>
            </label>
            <label className="form-field">Data do ocorrido
              <input required type="date" value={dataEvento} onChange={e => { setDataEvento(e.target.value); setRevisao(false); }} />
            </label>
          </div>
        </section>
        <section className="form-panel">
          <h2>2. Informações do animal</h2>
          <div className="form-grid">
            <label className="form-field">Espécie
              <select required value={especie} onChange={e => { setEspecie(e.target.value); setRevisao(false); }}>
                <option value="">Selecione</option>
                {especies.map(opcao => <option key={opcao} value={opcao}>{opcao}</option>)}
              </select>
            </label>
            <label className="form-field">Nome, se souber
              <input maxLength={80} value={nome} onChange={e => { setNome(e.target.value); setRevisao(false); }} placeholder="Ex.: Bob" />
            </label>
            <label className="form-field">Sexo
              <select value={sexo} onChange={e => { setSexo(e.target.value); setRevisao(false); }}>
                <option value="INDETERMINADO">Não sei</option><option value="MACHO">Macho</option><option value="FEMEA">Fêmea</option>
              </select>
            </label>
            <label className="form-field">Porte
              <select value={porte} onChange={e => { setPorte(e.target.value); setRevisao(false); }}>
                <option value="INDETERMINADO">Não sei</option><option value="PEQUENO">Pequeno</option><option value="MEDIO">Médio</option><option value="GRANDE">Grande</option>
              </select>
            </label>
            <label className="form-field">Cor predominante
              <select value={cor} onChange={e => { setCor(e.target.value); setRevisao(false); }}>
                <option value="">Não sei</option>{cores.filter(Boolean).map(opcao => <option key={opcao} value={opcao}>{opcao}</option>)}
              </select>
            </label>
            <label className="form-field">Idade aproximada
              <input maxLength={30} value={idade} onChange={e => { setIdade(e.target.value); setRevisao(false); }} placeholder="Ex.: adulto, cerca de 2 anos" />
            </label>
            <label className="form-field">Possui microchip?
              <select value={microchip} onChange={e => { setMicrochip(e.target.value); setRevisao(false); }}>
                <option value="">Não sei</option><option value="SIM">Sim</option><option value="NAO">Não</option>
              </select>
            </label>
            <label className="form-field form-field-full">Características e informações úteis
              <textarea value={descricao} onChange={e => { setDescricao(e.target.value); setRevisao(false); }} placeholder="Pelagem, coleira, comportamento, sinais particulares..." />
            </label>
          </div>
        </section>
        <section className="form-panel">
          <h2>3. Região aproximada</h2>
          <p className="note">Informe apenas a região do ocorrido. Não adicione número de residência, complemento nem dados de contato.</p>
          <div className="form-grid" style={{marginTop:18}}>
            <div className="form-field">
              <label htmlFor="cep">CEP de Votorantim</label>
              <input id="cep" required inputMode="numeric" maxLength={9} value={cep}
                onChange={e => { setCep(e.target.value); setEndereco(null); setConsultaCep(""); setRevisao(false); }} placeholder="00000-000" />
              <button type="button" className="inline-action" onClick={() => { void buscarCep(); }} disabled={consultando}>
                {consultando ? "Consultando..." : "Consultar CEP"}
              </button>
            </div>
            <label className="form-field">Referência pública (opcional)
              <input maxLength={255} value={referencia} onChange={e => { setReferencia(e.target.value); setRevisao(false); }} placeholder="Ex.: próximo ao parque do bairro" />
              <small>Não informe endereços residenciais.</small>
            </label>
          </div>
          {consultaCep && <p role="status" className={`note ${endereco ? "" : "note-warning"}`} style={{marginTop:15}}>{consultaCep}</p>}
          {endereco && <p style={{fontSize:14,lineHeight:1.7}}><strong>Endereço consultado:</strong> {endereco.logradouro || "Rua não informada"}, {endereco.bairro || "Bairro não informado"} — {endereco.cidade}/{endereco.uf}</p>}
          <p style={{marginTop:20,fontSize:14}}>O posicionamento do pin será incorporado diretamente neste formulário na próxima etapa.</p>
          <Link href="/localizacao" target="_blank" rel="noopener noreferrer" className="action action-secondary" style={{fontSize:14}}>Abrir protótipo do mapa</Link>
        </section>
        <section className="form-panel">
          <h2>4. Revisão do cadastro</h2>
          <p className="note note-warning">A revisão é apenas uma prévia. Não existe envio de ocorrência nem mensagem de cadastro concluído nesta versão; autenticação, mapa integrado e persistência ainda serão implementados.</p>
          <button className="action action-primary" type="submit" style={{marginTop:18}}>Revisar informações</button>
          {revisao && (
            <div aria-live="polite">
              <h3>Prévia da ocorrência — não salva</h3>
              <dl className="review-list">
                <div><dt>Tipo</dt><dd>{tipo === "PERDIDO" ? "Animal perdido" : "Animal encontrado"}</dd></div>
                <div><dt>Data</dt><dd>{dataEvento}</dd></div>
                <div><dt>Espécie / nome</dt><dd>{especie}{nome ? ` — ${nome}` : ""}</dd></div>
                <div><dt>Características</dt><dd>{cor || "Não informada"} · {porte} · {sexo} · {idade || "Idade não informada"} · microchip: {microchip || "Não sei"}</dd></div>
                <div><dt>Região</dt><dd>{endereco?.bairro || "Bairro não informado"} — Votorantim/SP</dd></div>
                <div><dt>Referência</dt><dd>{referencia || "Não informada"}</dd></div>
                <div style={{gridColumn:"1 / -1"}}><dt>Descrição</dt><dd>{descricao || "Não informada"}</dd></div>
              </dl>
              <p className="note">Próxima etapa de desenvolvimento: associar o pin, incluir fotos, autenticar o usuário e gravar no MySQL com status PENDENTE.</p>
            </div>
          )}
        </section>
      </form>
    </main>
  );
}
