"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import CustomButton from "../CustomButton";
type LocalizacaoConfirmada = { latitude_aproximada: number; longitude_aproximada: number };

type Tipo = "PERDIDO" | "ENCONTRADO";
type Endereco = { bairro: string | null; logradouro: string | null; cidade: string; uf: string; cep: string };
type ViaCepResposta = Endereco & { erro?: string; latitude?: number; longitude?: number };
const racasCaninas = ["Sem raça definida","Beagle","Border Collie","Boxer","Bulldog Francês","Chow Chow","Cocker Spaniel","Salsicha","Golden Retriever","Husky Siberiano","Labrador","Lhasa","Maltês","Pastor Alemão","Sheltie","Pequinês","Pinscher","Pitbull / American Staffordshire Terrier","Spitz Alemão","Poodle","Pug","Rottweiler","Shih-tzu","Yorkshire Terrier"];
const cores = ["Preta", "Branca", "Marrom", "Caramelo", "Cinza", "Amarela", "Laranja", "Outra"];

function hojeLocal() {
  const agora = new Date();
  return [String(agora.getFullYear()), String(agora.getMonth() + 1).padStart(2, "0"), String(agora.getDate()).padStart(2, "0")].join("-");
}

export default function FormularioOcorrencia() {
  const parametros = useSearchParams();
  // A URL é a fonte única da seleção. Assim, título, campos e endereço
  // permanecem sincronizados mesmo ao navegar entre perdido/encontrado.
  const tipo: Tipo = parametros.get("tipo") === "ENCONTRADO" ? "ENCONTRADO" : "PERDIDO";

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
  const [confirmacaoAberta,setConfirmacaoAberta] = useState(false);
  const [orientacoesLidas,setOrientacoesLidas] = useState(false);
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
      if (typeof dados.latitude !== "number" || typeof dados.longitude !== "number" || !dados.bairro) {
        throw new Error("Não foi possível identificar a região deste CEP. Confira os dados.");
      }
      setEndereco({ bairro: dados.bairro, logradouro: null, cidade: dados.cidade, uf: dados.uf, cep: limpo });
      setLocalizacao({ latitude_aproximada: dados.latitude, longitude_aproximada: dados.longitude });
      setConsultaCep("CEP verificado. O marcador público será posicionado na região aproximada de "+dados.bairro+".");
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
      setConsultaCep("Consulte o CEP para definir a região do animal antes de revisar.");
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
    if (!revisao || !endereco || !localizacao || !orientacoesLidas || enviando || registro) return;
    setEnviando(true);
    setErroEnvio("");
    setPrecisaLogin(false);
    try {
      const formulario = new FormData();
      formulario.append("confirmacao_privacidade", "confirmado");
      formulario.append("dados", JSON.stringify({
        tipo, especie, ...(tipo === "PERDIDO" ? { nome } : {}), raca, sexo, porte, cor, idade, microchip: tipo === "PERDIDO" ? microchip : "", dataEvento, descricao,
        cep: endereco.cep, referencia,
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
      setConfirmacaoAberta(false);
    } catch (error) {
      setErroEnvio(error instanceof Error ? error.message : "Falha ao enviar o cadastro.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="form-shell cadastro-pet">
      <header className="form-heading">
        <Link href="/resgate">← Voltar para animais perdidos e encontrados</Link>
        <span className="eyebrow">Cadastro de ocorrência</span>
        <h1>{tipo === "PERDIDO" ? "REGISTRAR ANIMAL PERDIDO" : "REGISTRAR ANIMAL ENCONTRADO"}</h1>
        <div className="etapas-cadastro" aria-label="Etapas do cadastro">
          <span><b>01</b> Animal</span><span><b>02</b> Localização</span><span><b>03</b> Fotos</span><span><b>04</b> Revisão</span>
        </div>
      </header>
      <form onSubmit={revisar}>
        <section className="form-panel cadastro-pet-painel">
          <div className="form-grid cadastro-pet-grid">
            <div className="pet-form-section-title form-field-full">
              <span className="pet-form-numero">01</span>
              <div><h2>{tipo==="PERDIDO"?"Dados do animal perdido":"Dados do animal encontrado"}</h2></div>
            </div>
            <label className="form-field">
              Tipo de ocorrência
              <select value={tipo} onChange={e => {
                const selecionado=e.target.value==="ENCONTRADO"?"ENCONTRADO":"PERDIDO";
                if(selecionado!==tipo){
                  if(selecionado==="ENCONTRADO")setMicrochip("");
                  setRevisao(false);
                  // O History API integra-se ao useSearchParams no Next.js:
                  // URL e campos são atualizados juntos, sem navegação pendente.
                  window.history.replaceState(null,"","/ocorrencias/nova?tipo="+selecionado);
                }
              }}>
                <option value="PERDIDO">Pet perdido</option>
                <option value="ENCONTRADO">Pet encontrado</option>
              </select>
            </label>

            {tipo === "PERDIDO" && <label className="form-field">
              Nome do animal
              <input maxLength={80} required value={nome} onChange={e => { setNome(e.target.value); setRevisao(false); }} placeholder="Nome pelo qual o animal atende" />
            </label>}

            <label className="form-field">
              Espécie
              <select required value={especie} onChange={e => { const valor = e.target.value; setEspecie(valor); setRaca(""); setRevisao(false); }}>
                <option value="">Selecione</option>
                <option value="Cachorro">Cachorro</option>
                <option value="Gato">Gato</option>
              </select>
            </label>

            <label className="form-field">
              {tipo === "PERDIDO" ? "Idade aproximada" : "Faixa etária aparente"}
              <input maxLength={30} value={idade} onChange={e => { setIdade(e.target.value); setRevisao(false); }} placeholder="Ex.: 3 anos ou 6 meses" />
            </label>

            {tipo === "PERDIDO" && <label className="form-field">
              Possui identificação por microchip?
              <select value={microchip} onChange={e => { setMicrochip(e.target.value); setRevisao(false); }}>
                <option value="">Selecione</option>
                <option value="SIM">Sim</option>
                <option value="NAO">Não</option>
              </select>
            </label>}

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
            </label>

            <label className="form-field">
              Raça
              <select value={raca} disabled={especie !== "Cachorro"} onChange={e => { setRaca(e.target.value); setRevisao(false); }}>
                <option value="">{especie === "Gato" ? "Raça desabilitada para gatos" : "Selecione"}</option>
                {racasCaninas.map(opcao => <option key={opcao} value={opcao}>{opcao === "Sem raça definida" ? "SRD (Sem Raça Definida)" : opcao}</option>)}
              </select>
            </label>

            <div className="pet-form-section-title form-field-full">
              <span className="pet-form-numero">02</span>
              <div><h2>Localização e data</h2></div>
            </div>
            <div className="form-field">
              <label htmlFor="cep">CEP da região da ocorrência</label>
              <input id="cep" required inputMode="numeric" maxLength={9} value={cep} onChange={e => {
                ++versaoCep.current;
                setConsultando(false);
                setCep(e.target.value);
                setEndereco(null);
                setLocalizacao(null);
                setConsultaCep("");
                setRevisao(false);
              }} placeholder="00000-000" />
              <CustomButton type="button" size="small" variant="gray" onClick={() => { void buscarCep(); }} disabled={consultando}>{consultando ? "Consultando..." : "Consultar CEP"}</CustomButton>
            </div>

            {consultaCep && <p role="status" className={"note form-field-full" + (endereco ? "" : " note-warning")}>{consultaCep}</p>}
            {endereco && <p className="regiao-confirmada form-field-full"><strong>Região identificada:</strong> {endereco.bairro || "Bairro não identificado"} — {endereco.cidade}/{endereco.uf}</p>}

            <label className="form-field">
              {tipo === "PERDIDO" ? "Local onde foi visto pela última vez" : "Local onde o animal foi encontrado"}
              <input maxLength={255} value={referencia} onChange={e => { setReferencia(e.target.value); setRevisao(false); }} placeholder="Ex.: próximo ao parque do bairro" />
              <small>Não informe endereço residencial.</small>
            </label>

            {endereco && localizacao && <div className="regiao-publica-card form-field-full" role="status">
              <div className="regiao-publica-simbolo" aria-hidden="true">⌖</div>
              <div>
                <strong>Região de publicação: {endereco.bairro}, Votorantim/SP</strong>
              </div>
            </div>}


            <label className="form-field">
              {tipo === "PERDIDO" ? "Data em que o animal foi perdido" : "Data em que o animal foi encontrado"}
              <input type="date" required max={hojeLocal()} value={dataEvento} onChange={e => { setDataEvento(e.target.value); setRevisao(false); }} />
            </label>

            <div className="pet-form-section-title form-field-full">
              <span className="pet-form-numero">03</span>
              <div><h2>Fotos e informações adicionais</h2></div>
            </div>
            <div className="form-field form-field-full">
              <label htmlFor="fotos-pet">Fotografias do animal</label>
              <div className="area-upload-foto">
                <input id="fotos-pet" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={trocarFotos} aria-describedby="instrucao-fotos" />
              </div>
              <small id="instrucao-fotos">Até 5 fotos JPG, PNG ou WebP, com no máximo 5 MB cada.</small>
              {erroFotos && <p role="alert" className="note note-warning">{erroFotos}</p>}
              {previas.length > 0 && <div className="galeria-previas">
                {previas.map((url,indice) => <Image key={url} src={url} alt={"Prévia da foto " + (indice + 1)} width={106} height={106} unoptimized />)}
              </div>}
            </div>

            <label className="form-field form-field-full">
              Características e observações
              <textarea value={descricao} onChange={e => { setDescricao(e.target.value); setRevisao(false); }} placeholder="Descreva detalhes da pelagem, coleira, comportamento e sinais que auxiliem na identificação." rows={4} />
            </label>
          </div>

          <div className="action-row">
            <CustomButton href="/" variant="gray">CANCELAR</CustomButton>
            <CustomButton variant="green" type="submit">REVISAR CADASTRO</CustomButton>
          </div>
        </section>

        {revisao && <section className="form-panel" aria-live="polite">
          <div className="pet-form-section-title">
            <span className="pet-form-numero">04</span>
            <div><h2>Confira as informações</h2></div>
          </div>
          <dl className="review-list">
            <div><dt>Tipo</dt><dd>{tipo === "PERDIDO" ? "Perdido" : "Encontrado"}</dd></div>
            <div><dt>Espécie / nome</dt><dd>{especie}{nome ? " — " + nome : ""}</dd></div>
            <div><dt>Raça</dt><dd>{especie === "Gato" ? "Não informada" : raca || "Não informada"}</dd></div>
            <div><dt>Sexo / porte</dt><dd>{sexo || "Não informado"} / {porte || "Não informado"}</dd></div>
            <div><dt>Cor/pelagem</dt><dd>{cor || "Não informada"}</dd></div>
            <div><dt>Idade aproximada</dt><dd>{idade || "Não informada"}</dd></div>
            {tipo==="PERDIDO"&&<div><dt>Microchip</dt><dd>{microchip || "Não informado"}</dd></div>}
            <div><dt>Região</dt><dd>{endereco?.bairro}, Votorantim/SP</dd></div>
            <div><dt>Local de referência</dt><dd>{referencia || "Não informado"}</dd></div>
            <div><dt>Data da ocorrência</dt><dd>{dataEvento.split("-").reverse().join("/")}</dd></div>
            <div><dt>Fotos selecionadas</dt><dd>{fotos.length}</dd></div>
            <div><dt>Localização no mapa</dt><dd>Região aproximada de {endereco?.bairro} definida pelo CEP</dd></div>
            <div><dt>Observações</dt><dd>{descricao || "Não informadas"}</dd></div>
          </dl>
          {registro ? (
            <div className="note" role="status">
              <strong>Solicitação nº {registro} recebida com sucesso.</strong>
              <p>Em análise.</p>
              <CustomButton href="/minhas-ocorrencias" variant="green">ACOMPANHAR MINHAS OCORRÊNCIAS</CustomButton>
            </div>
          ) : (
            <>
              {erroEnvio && <p role="alert" className="note note-warning">{erroEnvio}</p>}
              {precisaLogin && <div className="action-row"><CustomButton href="/login" variant="gray">ENTRAR</CustomButton><CustomButton href="/cadastro" variant="gray">CRIAR CONTA</CustomButton></div>}
              <div className="action-row">
                <CustomButton type="button" disabled={enviando} onClick={() => { setOrientacoesLidas(false); setConfirmacaoAberta(true); }}>
                  ENVIAR PARA ANÁLISE
                </CustomButton>
              </div>
            </>
          )}
        </section>}
      </form>
      {confirmacaoAberta && !registro && (
        <div className="orientacoes-overlay" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="orientacoes-titulo" aria-describedby="orientacoes-descricao" className="orientacoes-modal" onKeyDown={evento => { if (evento.key === "Escape" && !enviando) setConfirmacaoAberta(false); }}>
            <div className="orientacoes-topo"><span className="orientacoes-simbolo" aria-hidden="true">!</span><span>Antes de continuar</span></div>
            <h2 id="orientacoes-titulo">Proteja seus dados e sua privacidade</h2>
            <p id="orientacoes-descricao">Antes de publicar:</p>
            <ul>
              <li>Não publique seu endereço residencial, número da casa, telefone, e-mail ou outros dados pessoais no cartaz.</li>
              <li>Indique apenas a região aproximada e referências públicas para facilitar a localização do animal.</li>
              <li>Utilize o chat interno para conversar com outros usuários. Não compartilhe documentos, senhas ou códigos de verificação.</li>
              <li>As informações e fotografias enviadas serão analisadas antes da publicação.</li>
            </ul>
            <label className="orientacoes-aceite">
              <input type="checkbox" checked={orientacoesLidas} onChange={evento=>setOrientacoesLidas(evento.target.checked)} />
              <span>Li e compreendi as orientações de segurança e privacidade.</span>
            </label>
            <div className="orientacoes-acoes">
              <CustomButton variant="gray" type="button" disabled={enviando} onClick={()=>setConfirmacaoAberta(false)}>VOLTAR E REVISAR</CustomButton>
              <CustomButton variant="green" type="button" disabled={!orientacoesLidas || enviando} onClick={()=>{void enviarRegistro();}}>
                {enviando ? "Enviando..." : "CONCORDO E ENVIAR"}
              </CustomButton>
            </div>
            {erroEnvio && <p role="alert" className="note note-warning">{erroEnvio}</p>}
          </section>
        </div>
      )}
    </main>
  );
}
