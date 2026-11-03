"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import MapaOcorrencia, { type LocalizacaoConfirmada } from "../../../components/localizacao/MapaOcorrencia";

type Tipo = "PERDIDO" | "ENCONTRADO";
type Endereco = { bairro: string | null; logradouro: string | null; cidade: string; uf: string; cep: string };
type ViaCepResposta = Endereco & { erro?: string };
const racasCaninas = ["Sem raça definida","Beagle","Border Collie","Boxer","Bulldog Francês","Chow Chow","Cocker Spaniel","Salsicha","Golden Retriever","Husky Siberiano","Labrador","Lhasa","Maltês","Pastor Alemão","Sheltie","Pequinês","Pinscher","Pitbull / American Staffordshire Terrier","Spitz Alemão","Poodle","Pug","Rottweiler","Shih-tzu","Yorkshire Terrier"];
const cores = ["Preta", "Branca", "Marrom", "Caramelo", "Cinza", "Amarela", "Laranja", "Outra"];

function hojeLocal() {
  const agora = new Date();
  return [String(agora.getFullYear()), String(agora.getMonth() + 1).padStart(2, "0"), String(agora.getDate()).padStart(2, "0")].join("-");
}

export default function FormularioOcorrencia() {
  const parametros = useSearchParams();
  const [tipo, setTipo] = useState<Tipo>(parametros.get("tipo") === "ENCONTRADO" ? "ENCONTRADO" : "PERDIDO");
  const [especie, setEspecie] = useState("");
  const [nome, setNome] = useState("");
  const [raca, setRaca] = useState("");
  const [sexo, setSexo] = useState("");
  const [porte, setPorte] = useState("");
  const [cor, setCor] = useState("");
  const [idade, setIdade] = useState("");
  const [microchip, setMicrochip] = useState("");
  const [dataEvento, setDataEvento] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cep, setCep] = useState("");
  const [referencia, setReferencia] = useState("");
  const [endereco, setEndereco] = useState<Endereco | null>(null);
  const [localizacao, setLocalizacao] = useState<LocalizacaoConfirmada | null>(null);
  const [consultaCep, setConsultaCep] = useState("");
  const [consultando, setConsultando] = useState(false);
  const [revisao, setRevisao] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const [registro, setRegistro] = useState<number | null>(null);
  const [precisaLogin, setPrecisaLogin] = useState(false);
  const [fotos, setFotos] = useState<File[]>([]);
  const [previas, setPrevias] = useState<string[]>([]);
  const [erroFotos, setErroFotos] = useState("");
  const urlsPrevias = useRef<string[]>([]);
  const versaoCep = useRef(0);

  useEffect(() => () => {
    urlsPrevias.current.forEach(url => URL.revokeObjectURL(url));
  }, []);

  function trocarFotos(evento: ChangeEvent<HTMLInputElement>) {
    const arquivos = Array.from(evento.currentTarget.files || []);
    if (arquivos.length > 5) {
      setErroFotos("Selecione no máximo 5 fotos.");
      evento.currentTarget.value = "";
      return;
    }
    if (arquivos.some(arquivo => !["image/jpeg", "image/png", "image/webp"].includes(arquivo.type) || arquivo.size > 5 * 1024 * 1024)) {
      setErroFotos("Use fotos JPG, PNG ou WebP com até 5 MB cada.");
      evento.currentTarget.value = "";
      return;
    }
    urlsPrevias.current.forEach(url => URL.revokeObjectURL(url));
    const urls = arquivos.map(arquivo => URL.createObjectURL(arquivo));
    urlsPrevias.current = urls;
    setFotos(arquivos);
    setPrevias(urls);
    setErroFotos("");
    setRevisao(false);
  }

  async function buscarCep() {
    const versao = ++versaoCep.current;
    const limpo = cep.replace(/\D/g, "");
    setEndereco(null);
    setLocalizacao(null);
    setRevisao(false);
    if (!/^\d{8}$/.test(limpo)) {
      setConsultando(false);
      setConsultaCep("Informe um CEP com oito dígitos.");
      return;
    }
    setConsultando(true);
    setConsultaCep("");
    try {
      const resposta = await fetch("/api/localizacao/cep?cep=" + limpo, { cache: "no-store" });
      const dados = await resposta.json() as ViaCepResposta;
      if (versao !== versaoCep.current) return;
      if (!resposta.ok) throw new Error(dados.erro || "Não foi possível consultar o CEP.");
      setEndereco({ bairro: dados.bairro, logradouro: dados.logradouro, cidade: dados.cidade, uf: dados.uf, cep: limpo });
      setConsultaCep("CEP validado para Votorantim/SP.");
    } catch (error) {
      if (versao === versaoCep.current) setConsultaCep(error instanceof Error ? error.message : "Erro ao consultar o CEP.");
    } finally {
      if (versao === versaoCep.current) setConsultando(false);
    }
  }

  function revisar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!endereco || endereco.cep !== cep.replace(/\D/g, "")) {
      setConsultaCep("Consulte e valide o CEP antes de revisar os dados.");
      return;
    }
    if (!endereco.bairro) {
      setConsultaCep("O CEP não retornou bairro. Não é possível continuar sem validar a região.");
      return;
    }
    if (!localizacao) {
      setConsultaCep("Confirme a posição aproximada no mapa antes de revisar.");
      return;
    }
    if (dataEvento > hojeLocal()) {
      setConsultaCep("A data da ocorrência não pode estar no futuro.");
      return;
    }
    setConsultaCep("");
    setRevisao(true);
  }

  async function enviarRegistro() {
    if (!revisao || !endereco || !localizacao || enviando || registro) return;
    setEnviando(true);
    setErroEnvio("");
    setPrecisaLogin(false);
    try {
      const formulario = new FormData();
      formulario.append("dados", JSON.stringify({
        tipo, especie, nome, raca, sexo, porte, cor, idade, microchip, dataEvento, descricao,
        cep: endereco.cep, referencia, localizacao,
      }));
      fotos.forEach(foto => formulario.append("fotos", foto));
      const resposta = await fetch("/api/ocorrencias", { method: "POST", body: formulario });
      const dados = await resposta.json() as { id?: number; erro?: string; login?: boolean };
      if (!resposta.ok) {
        if (resposta.status === 401) setPrecisaLogin(true);
        throw new Error(dados.erro || "Não foi possível registrar a ocorrência.");
      }
      if (typeof dados.id !== "number") throw new Error("O servidor não retornou o registro criado.");
      setRegistro(dados.id);
    } catch (error) {
      setErroEnvio(error instanceof Error ? error.message : "Falha ao enviar o cadastro.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="form-shell">
      <header className="form-heading">
        <Link href="/resgate">← Voltar ao módulo de resgate</Link>
        <h1>{tipo === "PERDIDO" ? "REGISTRO PET PERDIDO" : "REGISTRO PET ENCONTRADO"} 🐾</h1>
        <p>Preencha os dados do pet. Confirme a região aproximada no mapa; após o envio, a ocorrência ficará aguardando aprovação da Prefeitura.</p>
        <p><Link href="/login">Entrar na minha conta</Link> · <Link href="/cadastro">Criar conta</Link></p>
      </header>
      <form onSubmit={revisar}>
        <section className="form-panel">
          <div className="form-grid">
            <label className="form-field">
              Tipo de ocorrência
              <select value={tipo} onChange={e => { setTipo(e.target.value as Tipo); setRevisao(false); }}>
                <option value="PERDIDO">Pet perdido</option>
                <option value="ENCONTRADO">Pet encontrado</option>
              </select>
            </label>

            <label className="form-field">
              {tipo === "PERDIDO" ? "Nome do pet" : "Nome (se souber)"}
              <input maxLength={80} required={tipo === "PERDIDO"} value={nome} onChange={e => { setNome(e.target.value); setRevisao(false); }} placeholder="Digite aqui..." />
            </label>

            <label className="form-field">
              Espécie
              <select required value={especie} onChange={e => { const valor = e.target.value; setEspecie(valor); setRaca(""); setRevisao(false); }}>
                <option value="">Selecione</option>
                <option value="Cachorro">Cachorro</option>
                <option value="Gato">Gato</option>
              </select>
            </label>

            <label className="form-field">
              {tipo === "PERDIDO" ? "Idade" : "Idade aparente"}
              <input maxLength={30} value={idade} onChange={e => { setIdade(e.target.value); setRevisao(false); }} placeholder="Ex.: 3 anos ou 6 meses" />
            </label>

            <label className="form-field">
              O pet possui microchip?
              <select value={microchip} onChange={e => { setMicrochip(e.target.value); setRevisao(false); }}>
                <option value="">Selecione</option>
                <option value="SIM">Sim</option>
                <option value="NAO">Não</option>
              </select>
            </label>

            <label className="form-field">
              Sexo
              <select value={sexo} onChange={e => { setSexo(e.target.value); setRevisao(false); }}>
                <option value="">Selecione</option>
                <option value="MACHO">Macho</option>
                <option value="FEMEA">Fêmea</option>
              </select>
            </label>

            <label className="form-field">
              Porte
              <select value={porte} onChange={e => { setPorte(e.target.value); setRevisao(false); }}>
                <option value="">Selecione</option>
                <option value="PEQUENO">Pequeno</option>
                <option value="MEDIO">Médio</option>
                <option value="GRANDE">Grande</option>
              </select>
            </label>

            <label className="form-field">
              Cor/Pelagem
              <select value={cor} onChange={e => { setCor(e.target.value); setRevisao(false); }}>
                <option value="">Selecione a cor predominante</option>
                {cores.map(opcao => <option key={opcao} value={opcao}>{opcao}</option>)}
              </select>
              <small>Detalhes de pelagem e mais de uma cor podem ser informados nas observações.</small>
            </label>

            <label className="form-field">
              Raça
              <select value={raca} disabled={especie !== "Cachorro"} onChange={e => { setRaca(e.target.value); setRevisao(false); }}>
                <option value="">{especie === "Gato" ? "Raça desabilitada para gatos" : "Selecione"}</option>
                {racasCaninas.map(opcao => <option key={opcao} value={opcao}>{opcao === "Sem raça definida" ? "SRD (Sem Raça Definida)" : opcao}</option>)}
              </select>
              {especie === "Gato" && <small>Conforme o formulário do primeiro semestre, este campo é desabilitado para gatos.</small>}
            </label>

            <div className="form-field">
              <label htmlFor="cep">CEP de Votorantim</label>
              <input id="cep" required inputMode="numeric" maxLength={9} value={cep} onChange={e => {
                ++versaoCep.current;
                setConsultando(false);
                setCep(e.target.value);
                setEndereco(null);
                setLocalizacao(null);
                setConsultaCep("");
                setRevisao(false);
              }} placeholder="00000-000" />
              <button type="button" className="inline-action" onClick={() => { void buscarCep(); }} disabled={consultando}>{consultando ? "Consultando..." : "Consultar CEP"}</button>
            </div>

            {consultaCep && <p role="status" className={"note" + (endereco ? "" : " note-warning")}>{consultaCep}</p>}
            {endereco && <p><strong>Região consultada:</strong> {endereco.logradouro || "Rua não informada"}, {endereco.bairro || "Bairro não informado"} — {endereco.cidade}/{endereco.uf}</p>}

            <label className="form-field">
              {tipo === "PERDIDO" ? "Local onde foi visto pela última vez" : "Local onde o animal foi encontrado"}
              <input maxLength={255} value={referencia} onChange={e => { setReferencia(e.target.value); setRevisao(false); }} placeholder="Ex.: próximo ao parque do bairro" />
              <small>Somente referência pública; não informe número de residência.</small>
            </label>

            {endereco && <div className="form-field">
              <span>Posição no mapa</span>
              <MapaOcorrencia key={endereco.cep} cep={endereco.cep} onConfirm={valor => { setLocalizacao(valor); setRevisao(false); }} />
            </div>}
            {!endereco && <p className="note">Consulte o CEP para selecionar e confirmar uma posição aproximada no mapa.</p>}

            <label className="form-field">
              {tipo === "PERDIDO" ? "Data em que o animal foi perdido" : "Data em que o animal foi encontrado"}
              <input type="date" required max={hojeLocal()} value={dataEvento} onChange={e => { setDataEvento(e.target.value); setRevisao(false); }} />
            </label>

            <div className="form-field">
              <label htmlFor="fotos-pet">Foto do pet</label>
              <div className="area-upload-foto">
                <input id="fotos-pet" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={trocarFotos} aria-describedby="instrucao-fotos" />
              </div>
              <small id="instrucao-fotos">Até 5 fotos JPG, PNG ou WebP, com no máximo 5 MB cada.</small>
              {erroFotos && <p role="alert" className="note note-warning">{erroFotos}</p>}
              {previas.length > 0 && <div className="galeria-previas">
                {previas.map((url,indice) => <Image key={url} src={url} alt={"Prévia da foto " + (indice + 1)} width={106} height={106} unoptimized />)}
              </div>}
            </div>

            <label className="form-field">
              Observações adicionais
              <textarea value={descricao} onChange={e => { setDescricao(e.target.value); setRevisao(false); }} placeholder="Coleira, pelagem, comportamento, sinais particulares..." rows={4} />
            </label>
          </div>

          <p className="note" style={{marginTop:24}}>Revise os dados antes de enviar. O registro será salvo no banco com status PENDENTE e só ficará visível no mapa após aprovação administrativa.</p>
          <div className="action-row">
            <Link href="/resgate" className="action action-secondary">CANCELAR</Link>
            <button className="action action-primary" type="submit">REVISAR CADASTRO</button>
          </div>
        </section>

        {revisao && <section className="form-panel" aria-live="polite">
          <h2>Revisão da ocorrência</h2>
          <dl className="review-list">
            <div><dt>Tipo</dt><dd>{tipo === "PERDIDO" ? "Perdido" : "Encontrado"}</dd></div>
            <div><dt>Espécie / nome</dt><dd>{especie}{nome ? " — " + nome : ""}</dd></div>
            <div><dt>Raça</dt><dd>{especie === "Gato" ? "Não informada" : raca || "Não informada"}</dd></div>
            <div><dt>Sexo / porte</dt><dd>{sexo || "Não informado"} / {porte || "Não informado"}</dd></div>
            <div><dt>Cor/pelagem</dt><dd>{cor || "Não informada"}</dd></div>
            <div><dt>Idade / microchip</dt><dd>{idade || "Não informada"} / {microchip || "Não informado"}</dd></div>
            <div><dt>Região</dt><dd>{endereco?.bairro}, Votorantim/SP</dd></div>
            <div><dt>Local de referência</dt><dd>{referencia || "Não informado"}</dd></div>
            <div><dt>Data</dt><dd>{dataEvento}</dd></div>
            <div><dt>Fotos selecionadas</dt><dd>{fotos.length}</dd></div>
            <div><dt>Pin aproximado</dt><dd>{localizacao?.latitude_aproximada}, {localizacao?.longitude_aproximada}</dd></div>
            <div><dt>Observações</dt><dd>{descricao || "Não informadas"}</dd></div>
          </dl>
          {registro ? (
            <div className="note" role="status">
              <strong>Ocorrência #{registro} registrada com sucesso no MySQL.</strong>
              <p>Status: PENDENTE. Ela aparecerá no mapa e nos cards depois da aprovação administrativa.</p>
              <Link href="/minhas-ocorrencias" className="action action-primary">ACOMPANHAR MINHAS OCORRÊNCIAS</Link>
            </div>
          ) : (
            <>
              {erroEnvio && <p role="alert" className="note note-warning">{erroEnvio}</p>}
              {precisaLogin && <div className="action-row"><Link href="/login" className="action action-secondary">ENTRAR</Link><Link href="/cadastro" className="action action-secondary">CRIAR CONTA</Link></div>}
              <div className="action-row">
                <button type="button" className="action action-primary" disabled={enviando} onClick={() => { void enviarRegistro(); }}>
                  {enviando ? "Enviando para análise..." : "ENVIAR PARA ANÁLISE"}
                </button>
              </div>
            </>
          )}
        </section>}
      </form>
    </main>
  );
}
