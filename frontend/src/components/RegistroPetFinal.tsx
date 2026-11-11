"use client";

import { useRef, useState, type ChangeEvent, type FocusEvent } from "react";
import Link from "next/link";
import { Container, Form } from "react-bootstrap";
import { useFormik } from "formik";
import * as Yup from "yup";
import CustomButton from "./CustomButton";
import ModalSucesso from "./ModalSucesso/ModalSucesso";
import UploadFotoPet from "./UploadFotoPet";
import { ErroApi, solicitarApi } from "../lib/frontend-api";
import wizard from "./RegistroPetFinal.module.css";

type TipoOcorrencia = "PERDIDO" | "ENCONTRADO";
type ValoresFormulario = {
  nome: string;
  especie: string;
  idade: string;
  microchip: string;
  sexo: string;
  tamanho: string;
  cor: string;
  raca: string;
  cep: string;
  localizacao: string;
  data: string;
  observacoes: string;
  fotos: FileList | null;
  confirmarPrivacidade: boolean;
  situacaoLarTemporario: string;
};
type EnderecoViaCep = {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  ibge?: string;
  erro?: boolean;
};
type Opcoes = { value: string; label: string }[];

const opcoesEspecie: Opcoes = [
  { value: "cachorro", label: "Cachorro" },
  { value: "gato", label: "Gato" },
];
const opcoesSexo: Opcoes = [
  { value: "macho", label: "Macho" },
  { value: "femea", label: "Fêmea" },
];
const opcoesPorte: Opcoes = [
  { value: "pequeno", label: "Pequeno" },
  { value: "medio", label: "Médio" },
  { value: "grande", label: "Grande" },
];
const opcoesRaca: Opcoes = [
  { value: "Sem raça definida", label: "SRD (Sem Raça Definida)" },
  ...["Beagle", "Border Collie", "Boxer", "Bulldog Francês", "Chow Chow", "Cocker Spaniel", "Salsicha",
    "Golden Retriever", "Husky Siberiano", "Labrador", "Lhasa", "Maltês", "Pastor Alemão", "Sheltie",
    "Pequinês", "Pinscher", "Pitbull / American Staffordshire Terrier", "Spitz Alemão", "Poodle", "Pug",
    "Rottweiler", "Shih-tzu", "Yorkshire Terrier"].map((raca) => ({ value: raca, label: raca })),
];
const opcoesCor: Opcoes = ["Preta", "Branca", "Marrom", "Caramelo", "Cinza", "Amarela", "Laranja", "Outra"]
  .map((cor) => ({ value: cor, label: cor }));
const opcoesMicrochip: Opcoes = [
  { value: "yes", label: "Sim" },
  { value: "no", label: "Não" },
];
const opcoesLarTemporario: Opcoes = [
  { value: "PODE_ACOLHER", label: "Tenho condições do lar temporário" },
  { value: "NAO_PODE_ACOLHER", label: "Não tenho condições" },
];
const camposPorEtapa: Record<number, (keyof ValoresFormulario)[]> = {
  1: ["nome", "especie"],
  2: ["cep"],
  3: ["data", "confirmarPrivacidade", "situacaoLarTemporario"],
};
const agora = new Date();
const hoje = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;

export default function RegistroPetFinal({
  tipo,
  styles,
}: {
  tipo: TipoOcorrencia;
  styles: Record<string, string>;
}) {
  const [etapa, setEtapa] = useState(1);
  const [endereco, setEndereco] = useState<EnderecoViaCep | null>(null);
  const [cepConsultado, setCepConsultado] = useState("");
  const [cepCarregando, setCepCarregando] = useState(false);
  const [erroCep, setErroCep] = useState("");
  const [erroEnvio, setErroEnvio] = useState("");
  const [precisaLogin, setPrecisaLogin] = useState(false);
  const [registroCriado, setRegistroCriado] = useState<number | null>(null);
  const consultasCep = useRef(new Map<string, Promise<EnderecoViaCep>>());

  const formik = useFormik<ValoresFormulario>({
    initialValues: {
      nome: "",
      especie: "",
      idade: "",
      microchip: "",
      sexo: "",
      tamanho: "",
      cor: "",
      raca: "",
      cep: "",
      localizacao: "",
      data: "",
      observacoes: "",
      fotos: null,
      confirmarPrivacidade: false,
      situacaoLarTemporario: "",
    },
    validationSchema: Yup.object({
      nome: tipo === "PERDIDO" ? Yup.string().trim().required("Este campo é obrigatório.") : Yup.string(),
      especie: Yup.string().required("Selecione a espécie do animal."),
      cep: Yup.string()
        .required("Informe o CEP.")
        .matches(/^\d{5}-?\d{3}$/, "Informe um CEP válido com 8 dígitos."),
      data: Yup.string()
        .required("Informe a data da ocorrência.")
        .test("data-valida", "Informe uma data válida, que não seja futura.", (valor) => {
          if (!valor) return true;
          const data = new Date(`${valor}T12:00:00`);
          return /^\d{4}-\d{2}-\d{2}$/.test(valor) && !Number.isNaN(data.getTime()) && valor <= hoje;
        }),
      confirmarPrivacidade: Yup.boolean().oneOf([true], "Confirme as orientações de privacidade."),
      situacaoLarTemporario: tipo === "ENCONTRADO"
        ? Yup.string().oneOf(["PODE_ACOLHER", "NAO_PODE_ACOLHER"], "Selecione uma opção.").required("Selecione a situação do lar temporário.")
        : Yup.string().notRequired(),
    }),
    onSubmit: async (valores) => {
      setErroEnvio("");
      setPrecisaLogin(false);
      setRegistroCriado(null);
      let idCriado: number | null = null;
      try {
        const fotosSelecionadas = Array.from(valores.fotos || []);
        if (fotosSelecionadas.length > 5 || fotosSelecionadas.some(foto => foto.size > 4 * 1024 * 1024 || foto.size === 0)) {
          throw new Error("Envie no máximo cinco fotos, com até 4 MB cada, para publicação na Vercel.");
        }
        const formulario = new FormData();
        formulario.append("confirmacao_privacidade", "confirmado");
        formulario.append("dados", JSON.stringify({
          tipo,
          ...(tipo === "PERDIDO" ? { nome: valores.nome } : {}),
          especie: valores.especie === "cachorro" ? "Cachorro" : "Gato",
          idade: valores.idade,
          microchip: tipo === "PERDIDO" ? (valores.microchip === "yes" ? "SIM" : valores.microchip === "no" ? "NAO" : "") : "",
          sexo: valores.sexo === "femea" ? "FEMEA" : valores.sexo === "macho" ? "MACHO" : "",
          porte: valores.tamanho ? valores.tamanho.toUpperCase() : "",
          cor: valores.cor,
          raca: valores.raca,
          cep: valores.cep.replace(/\D/g, ""),
          referencia: valores.localizacao,
          dataEvento: valores.data,
          descricao: valores.observacoes,
          ...(tipo === "ENCONTRADO" ? { situacaoLarTemporario: valores.situacaoLarTemporario } : {}),
        }));
        // O cadastro é enviado primeiro, sem fotos: cada requisição fica abaixo
        // do limite de 4,5 MB das funções da Vercel.
        const resultado = await solicitarApi<{ id: number; mensagem: string }>(
          "/api/ocorrencias",
          { method: "POST", body: formulario },
        );
        idCriado = resultado.id;
        for (const foto of fotosSelecionadas) {
          const dadosFoto = new FormData();
          dadosFoto.append("fotos", foto);
          await solicitarApi<{ ok: boolean }>(
            `/api/ocorrencias/${resultado.id}/fotos`,
            { method: "POST", body: dadosFoto },
          );
        }
        setRegistroCriado(resultado.id);
      } catch (error) {
        if (idCriado !== null) {
          setRegistroCriado(idCriado);
          setErroEnvio("A ocorrência foi criada, mas uma foto não pôde ser enviada. Abra Minhas ocorrências para completar as fotos.");
          return;
        }
        if (error instanceof ErroApi && error.status === 401) setPrecisaLogin(true);
        setErroEnvio(error instanceof Error ? error.message : "Não foi possível registrar a ocorrência.");
      }
    },
  });

  async function consultarCep(valor: string) {
    const cep = valor.replace(/\D/g, "");
    setErroCep("");
    if (!/^\d{8}$/.test(cep)) {
      setEndereco(null);
      setCepConsultado("");
      setCepCarregando(false);
      return false;
    }
    if (cepConsultado === cep && endereco) return true;

    setCepCarregando(true);
    try {
      let consulta = consultasCep.current.get(cep);
      if (!consulta) {
        consulta = (async () => {
          try {
            const resposta = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
              headers: { Accept: "application/json" },
              signal: AbortSignal.timeout(7000),
            });
            if (!resposta.ok) throw new Error("ViaCEP indisponível.");
            return await resposta.json() as EnderecoViaCep;
          } catch {
            const regiao = await solicitarApi<{ bairro: string; cidade: string; uf: string }>(
              `/api/localizacao/cep?cep=${cep}`,
            );
            return { bairro: regiao.bairro, localidade: regiao.cidade, uf: regiao.uf, ibge: "3557006" };
          }
        })();
        consultasCep.current.set(cep, consulta);
      }
      const resultado = await consulta;
      if (resultado.erro) throw new Error("CEP não encontrado. Confira os oito dígitos.");
      if (resultado.ibge !== "3557006" || resultado.uf?.toUpperCase() !== "SP") {
        throw new Error("O CEP precisa pertencer ao município de Votorantim/SP.");
      }
      if (!resultado.bairro?.trim()) {
        throw new Error("O ViaCEP não retornou o bairro. Confira o CEP informado.");
      }
      if (formik.values.cep.replace(/\D/g, "") === cep) {
        setEndereco(resultado);
        setCepConsultado(cep);
        setErroCep("");
      } else {
        return false;
      }
      return true;
    } catch (error) {
      consultasCep.current.delete(cep);
      if (formik.values.cep.replace(/\D/g, "") === cep) {
        setEndereco(null);
        setCepConsultado("");
        setErroCep(error instanceof Error ? error.message : "Não foi possível consultar o CEP.");
      }
      return false;
    } finally {
      if (formik.values.cep.replace(/\D/g, "") === cep) setCepCarregando(false);
    }
  }

  function alterarCep(evento: ChangeEvent<HTMLInputElement>) {
    const valor = evento.target.value;
    void formik.setFieldValue("cep", valor);
    if (valor.replace(/\D/g, "") !== cepConsultado) {
      setEndereco(null);
      setCepConsultado("");
      setErroCep("");
      setCepCarregando(false);
    }
  }

  function sairDoCep(evento: FocusEvent<HTMLInputElement>) {
    void formik.setFieldTouched("cep", true);
    void consultarCep(evento.currentTarget.value);
  }

  function erroDoCampo(campo: keyof ValoresFormulario) {
    const erro = formik.errors[campo];
    return formik.touched[campo] && typeof erro === "string" ? erro : "";
  }

  async function validarEtapaAtual() {
    const campos = camposPorEtapa[etapa];
    await formik.setTouched({
      ...formik.touched,
      ...Object.fromEntries(campos.map((campo) => [campo, true])),
    });
    const erros = await formik.validateForm();
    if (campos.some((campo) => Boolean(erros[campo]))) return;
    if (etapa === 2 && !(await consultarCep(formik.values.cep))) return;
    setEtapa((atual) => Math.min(atual + 1, 3));
  }

  async function validarEEnviar() {
    await formik.setTouched({
      nome: true,
      especie: true,
      cep: true,
      data: true,
      confirmarPrivacidade: true,
      situacaoLarTemporario: true,
    });
    const erros = await formik.validateForm();
    if (erros.nome || erros.especie) {
      setEtapa(1);
      return;
    }
    if (erros.cep || !(await consultarCep(formik.values.cep))) {
      setEtapa(2);
      return;
    }
    if (erros.data || erros.confirmarPrivacidade || erros.situacaoLarTemporario) return;
    await formik.submitForm();
  }

  function cancelarCadastro() {
    formik.resetForm();
    setEtapa(1);
    setEndereco(null);
    setCepConsultado("");
    setCepCarregando(false);
    setErroCep("");
    setErroEnvio("");
    setPrecisaLogin(false);
  }

  const tipoTexto = tipo === "PERDIDO" ? "PERDIDO" : "ENCONTRADO";
  const formularioDestino = `/registro-pet-${tipo === "PERDIDO" ? "perdido" : "encontrado"}`;

  return (
    <Container className={`py-5 ${wizard.formulario}`} style={{ maxWidth: "900px" }}>
      <h2 className={`${styles.tituloFormulario} mb-4`}>REGISTRO PET {tipoTexto} 🐾</h2>
      <ol className={wizard.progresso} aria-label={`Etapa ${etapa} de 3`}>
        {["Informações do animal", "Localização", "Informações complementares"].map((titulo, indice) => (
          <li key={titulo} className={indice + 1 <= etapa ? wizard.etapaAtiva : ""} aria-current={etapa === indice + 1 ? "step" : undefined}>
            <span className={wizard.numeroEtapa}>{indice + 1}</span>
            <span>{titulo}</span>
          </li>
        ))}
      </ol>

      <Form noValidate onSubmit={(evento) => { evento.preventDefault(); void validarEEnviar(); }}>
        <section className={wizard.secaoEtapa} hidden={etapa !== 1} aria-labelledby="titulo-etapa-1">
          <h3 id="titulo-etapa-1" className={wizard.tituloEtapa}>1. Informações do animal</h3>
          <div className={wizard.gradeCampos}>
            {tipo === "PERDIDO" && (
              <Form.Group className="mb-3" controlId="nomePet">
                <Form.Label className={wizard.rotuloCampo}>Nome <span aria-hidden="true">*</span></Form.Label>
                <Form.Control name="nome" placeholder="Digite o nome do animal" value={formik.values.nome}
                  onChange={formik.handleChange} onBlur={formik.handleBlur} isInvalid={Boolean(erroDoCampo("nome"))} />
                <Form.Control.Feedback type="invalid">{erroDoCampo("nome")}</Form.Control.Feedback>
              </Form.Group>
            )}
            <Form.Group className="mb-3" controlId="especie">
              <Form.Label className={wizard.rotuloCampo}>Espécie <span aria-hidden="true">*</span></Form.Label>
              <Form.Select name="especie" value={formik.values.especie} onChange={(evento) => {
                formik.handleChange(evento);
                if (evento.currentTarget.value === "gato") void formik.setFieldValue("raca", "");
              }} onBlur={formik.handleBlur} isInvalid={Boolean(erroDoCampo("especie"))}>
                <option value="">Selecione</option>
                {opcoesEspecie.map((opcao) => <option key={opcao.value} value={opcao.value}>{opcao.label}</option>)}
              </Form.Select>
              <Form.Control.Feedback type="invalid">{erroDoCampo("especie")}</Form.Control.Feedback>
            </Form.Group>
            <Form.Group className="mb-3" controlId="idade">
              <Form.Label className={wizard.rotuloCampo}>{tipo === "PERDIDO" ? "Idade" : "Idade aparente"}</Form.Label>
              <Form.Control name="idade" placeholder="Ex.: 3 anos ou 6 meses" value={formik.values.idade} onChange={formik.handleChange} />
            </Form.Group>
            <Form.Group className="mb-3" controlId="sexo">
              <Form.Label className={wizard.rotuloCampo}>Sexo</Form.Label>
              <Form.Select name="sexo" value={formik.values.sexo} onChange={formik.handleChange}>
                <option value="">Selecione</option>
                {opcoesSexo.map((opcao) => <option key={opcao.value} value={opcao.value}>{opcao.label}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3" controlId="tamanho">
              <Form.Label className={wizard.rotuloCampo}>Porte</Form.Label>
              <Form.Select name="tamanho" value={formik.values.tamanho} onChange={formik.handleChange}>
                <option value="">Selecione</option>
                {opcoesPorte.map((opcao) => <option key={opcao.value} value={opcao.value}>{opcao.label}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3" controlId="cor">
              <Form.Label className={wizard.rotuloCampo}>Cor/Pelagem</Form.Label>
              <Form.Select name="cor" value={formik.values.cor} onChange={formik.handleChange}>
                <option value="">Selecione</option>
                {opcoesCor.map((opcao) => <option key={opcao.value} value={opcao.value}>{opcao.label}</option>)}
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-3" controlId="raca">
              <Form.Label className={wizard.rotuloCampo}>Raça</Form.Label>
              <Form.Select name="raca" value={formik.values.raca} disabled={formik.values.especie === "gato"} onChange={formik.handleChange}>
                <option value="">Selecione</option>
                {opcoesRaca.map((opcao) => <option key={opcao.value} value={opcao.value}>{opcao.label}</option>)}
              </Form.Select>
            </Form.Group>
            {tipo === "PERDIDO" && (
              <Form.Group className="mb-3" controlId="microchipSelect">
                <Form.Label className={wizard.rotuloCampo}>O pet possui microchip?</Form.Label>
                <Form.Select name="microchip" value={formik.values.microchip} onChange={formik.handleChange}>
                  <option value="">Selecione</option>
                  {opcoesMicrochip.map((opcao) => <option key={opcao.value} value={opcao.value}>{opcao.label}</option>)}
                </Form.Select>
              </Form.Group>
            )}
          </div>
        </section>

        <section className={wizard.secaoEtapa} hidden={etapa !== 2} aria-labelledby="titulo-etapa-2">
          <h3 id="titulo-etapa-2" className={wizard.tituloEtapa}>2. Localização</h3>
          <div className={wizard.gradeCampos}>
            <Form.Group className="mb-3" controlId="cep">
              <Form.Label className={wizard.rotuloCampo}>CEP de Votorantim/SP <span aria-hidden="true">*</span></Form.Label>
              <Form.Control name="cep" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000"
                value={formik.values.cep} onChange={alterarCep} onBlur={sairDoCep}
                isInvalid={Boolean(erroDoCampo("cep") || erroCep)} aria-describedby="feedback-cep" />
              <Form.Control.Feedback type="invalid" id="feedback-cep">{erroDoCampo("cep") || erroCep}</Form.Control.Feedback>
              {cepCarregando && <div className={wizard.feedbackCep} role="status">Consultando ViaCEP...</div>}
            </Form.Group>
            {endereco && (
              <>
                <Form.Group className="mb-3" controlId="logradouroViaCep">
                  <Form.Label className={wizard.rotuloCampo}>Rua/Logradouro</Form.Label>
                  <Form.Control value={endereco.logradouro || "Não informado pelo ViaCEP"} readOnly />
                </Form.Group>
                <Form.Group className="mb-3" controlId="bairroViaCep">
                  <Form.Label className={wizard.rotuloCampo}>Bairro</Form.Label>
                  <Form.Control value={endereco.bairro || ""} readOnly />
                </Form.Group>
                <Form.Group className="mb-3" controlId="cidadeViaCep">
                  <Form.Label className={wizard.rotuloCampo}>Cidade</Form.Label>
                  <Form.Control value={endereco.localidade || ""} readOnly />
                </Form.Group>
                <Form.Group className="mb-3" controlId="ufViaCep">
                  <Form.Label className={wizard.rotuloCampo}>Estado (UF)</Form.Label>
                  <Form.Control value={endereco.uf || ""} readOnly />
                </Form.Group>
              </>
            )}
            <Form.Group className={`mb-3 ${wizard.larguraTotal}`} controlId="localEncontro">
              <Form.Label className={wizard.rotuloCampo}>{tipo === "PERDIDO" ? "Ponto de referência" : "Local onde o animal foi encontrado"}</Form.Label>
              <Form.Control name="localizacao" placeholder="Informe um ponto público de referência, sem endereço residencial"
                value={formik.values.localizacao} onChange={formik.handleChange} />
            </Form.Group>
          </div>
          {endereco && <p className={wizard.avisoPrivacidade} role="status">
            Endereço exibido para conferência. O cadastro utiliza o CEP validado e publica somente a região aproximada; não informe número residencial ou complemento.
          </p>}
        </section>

        <section className={wizard.secaoEtapa} hidden={etapa !== 3} aria-labelledby="titulo-etapa-3">
          <h3 id="titulo-etapa-3" className={wizard.tituloEtapa}>3. Informações complementares</h3>
          <div className={wizard.gradeCampos}>
            <Form.Group className="mb-3" controlId="dataEvento">
              <Form.Label className={wizard.rotuloCampo}>{tipo === "PERDIDO" ? "Data em que o animal foi visto pela última vez" : "Data em que o animal foi encontrado"} <span aria-hidden="true">*</span></Form.Label>
              <Form.Control name="data" type="date" max={hoje} value={formik.values.data} onChange={formik.handleChange}
                onBlur={formik.handleBlur} isInvalid={Boolean(erroDoCampo("data"))} />
              <Form.Control.Feedback type="invalid">{erroDoCampo("data")}</Form.Control.Feedback>
            </Form.Group>
            {tipo === "ENCONTRADO" && (
              <Form.Group className="mb-3" controlId="situacaoLarTemporario">
                <Form.Label className={wizard.rotuloCampo}>Qual é a situação do lar temporário para este animal? <span aria-hidden="true">*</span></Form.Label>
                <Form.Select name="situacaoLarTemporario" value={formik.values.situacaoLarTemporario}
                  onChange={formik.handleChange} onBlur={formik.handleBlur}
                  isInvalid={Boolean(erroDoCampo("situacaoLarTemporario"))}>
                  <option value="">Selecione uma opção</option>
                  {opcoesLarTemporario.map((opcao) => <option key={opcao.value} value={opcao.value}>{opcao.label}</option>)}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{erroDoCampo("situacaoLarTemporario")}</Form.Control.Feedback>
              </Form.Group>
            )}
            <div className={wizard.larguraTotal}>
              <UploadFotoPet controlId="petFoto" label="Fotos do animal" aoMudar={(arquivos) => void formik.setFieldValue("fotos", arquivos)} />
            </div>
            <Form.Group className={`mb-3 ${wizard.larguraTotal}`} controlId="observacoes">
              <Form.Label className={wizard.rotuloCampo}>Observações adicionais</Form.Label>
              <Form.Control as="textarea" rows={4} name="observacoes" placeholder="Descreva características ou informações úteis"
                value={formik.values.observacoes} onChange={formik.handleChange} />
            </Form.Group>
            <Form.Group className={`mb-3 ${wizard.larguraTotal}`}>
              <Form.Check type="checkbox" name="confirmarPrivacidade" checked={formik.values.confirmarPrivacidade}
                onChange={formik.handleChange} onBlur={formik.handleBlur}
                isInvalid={Boolean(erroDoCampo("confirmarPrivacidade"))}
                label="Confirmo que não incluí telefone, e-mail ou endereço residencial e que a localização será aproximada." />
              {erroDoCampo("confirmarPrivacidade") && <div className="invalid-feedback d-block">{erroDoCampo("confirmarPrivacidade")}</div>}
            </Form.Group>
          </div>
        </section>

        {erroEnvio && <p role="alert" className="text-danger">{erroEnvio}</p>}
        {precisaLogin && (
          <p>Entre na sua conta para enviar o cadastro. <Link href={`/login?retorno=${encodeURIComponent(formularioDestino)}`}>Acessar login</Link></p>
        )}
        <div className={`${styles.containerBotoes} ${wizard.acoesEtapa}`}>
          {etapa < 3 ? (
            <div className={styles.wrapperBtn}>
              <CustomButton type="button" variant="green" onClick={() => void validarEtapaAtual()}>PRÓXIMO</CustomButton>
            </div>
          ) : (
            <div className={styles.wrapperBtn}>
              <CustomButton type="submit" variant="green" disabled={formik.isSubmitting}>
                {formik.isSubmitting ? "ENVIANDO..." : "SALVAR"}
              </CustomButton>
            </div>
          )}
          {etapa > 1 && <div className={styles.wrapperBtn}>
            <CustomButton type="button" variant="gray" onClick={() => setEtapa((atual) => Math.max(atual - 1, 1))}>VOLTAR</CustomButton>
          </div>}
          <div className={styles.wrapperBtn}>
            <CustomButton type="button" variant="gray" onClick={cancelarCadastro}>CANCELAR</CustomButton>
          </div>
        </div>
      </Form>
      <ModalSucesso
        exibir={registroCriado !== null}
        aoFechar={() => setRegistroCriado(null)}
        titulo="REGISTRO ENVIADO"
        mensagem={`A ocorrência #${registroCriado ?? ""} foi enviada para análise. Ela aparecerá no mapa após aprovação.`}
      />
    </Container>
  );
}
