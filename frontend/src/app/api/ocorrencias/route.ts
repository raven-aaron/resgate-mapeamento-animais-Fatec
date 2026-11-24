import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { administradorAtual, usuarioAtual } from "../../../lib/auth";
import { buscarPublicas } from "../../../lib/ocorrencias";
import { mesmaOrigem } from "../../../lib/seguranca";
import { localizarBairroPorCep, ErroLocalizacao } from "../../../lib/localizacao-cep";
import { validarSituacaoLarTemporario } from "../../../lib/situacao-lar-temporario.mjs";
import { salvarFoto, excluirFoto, ErroArmazenamento, type ProvedorFoto } from "../../../lib/storage-fotos";
import { cadastrarOcorrencia } from "../../../models/ocorrencias";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const filtros = Object.fromEntries(request.nextUrl.searchParams.entries());
    const ocorrencias = await buscarPublicas(filtros);
    return NextResponse.json({ ocorrencias }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Erro na listagem pública", error);
    return NextResponse.json({ erro: "Não foi possível carregar os animais." }, { status: 500 });
  }
}

type Cadastro = {
  tipo?: string; nome?: string; especie?: string; raca?: string; sexo?: string; porte?: string;
  cor?: string; idade?: string; microchip?: string; dataEvento?: string; descricao?: string;
  cep?: string; referencia?: string; situacaoLarTemporario?: string;
};

function texto(valor: unknown, limite: number) {
  return typeof valor === "string" ? valor.trim().slice(0, limite) : "";
}
function dataValida(valor: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return false;
  const data = new Date(valor + "T12:00:00Z");
  return !Number.isNaN(data.getTime()) && data.toISOString().slice(0, 10) === valor && valor <= new Date().toISOString().slice(0, 10);
}
function extensaoImagem(bytes: Uint8Array): string | null {
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes.length > 8 && [137,80,78,71,13,10,26,10].every((x,i) => bytes[i] === x)) return "png";
  if (bytes.length > 12 && String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP") return "webp";
  return null;
}

export async function POST(request: Request) {
  if (!mesmaOrigem(request)) return NextResponse.json({ erro: "Origem não permitida." }, { status: 403 });
  const usuarioCidadao = await usuarioAtual();
  const usuario = usuarioCidadao ?? await administradorAtual();
  if (!usuario) return NextResponse.json({ erro: "Entre na sua conta antes de registrar um animal.", login: true }, { status: 401 });
  if (Number(request.headers.get("content-length") || 0) > 27 * 1024 * 1024) {
    return NextResponse.json({ erro: "Fotos excedem o limite de tamanho." }, { status: 413 });
  }
  let concluiu = false;
  const criadas: { nome: string; provedor: ProvedorFoto }[] = [];
  try {
    const formulario = await request.formData();
    if (formulario.get("confirmacao_privacidade") !== "confirmado") {
      return NextResponse.json({ erro: "Confirme as orientações de privacidade antes de enviar." }, { status: 400 });
    }
    const campoDados = formulario.get("dados");
    if (typeof campoDados !== "string" || campoDados.length > 10000) {
      return NextResponse.json({ erro: "Cadastro inválido." }, { status: 400 });
    }
    const dados = JSON.parse(campoDados) as Cadastro;
    const tipo = texto(dados.tipo, 20);
    if (usuario.adminResgate && tipo !== "ENCONTRADO") {
      return NextResponse.json({ erro: "Usuários administrativos podem cadastrar apenas animais encontrados." }, { status: 403 });
    }
    const especie = texto(dados.especie, 50);
    const nome = texto(dados.nome, 80);
    const raca = texto(dados.raca, 80);
    const cor = texto(dados.cor, 50);
    const sexo = texto(dados.sexo, 20);
    const porte = texto(dados.porte, 20);
    const microchip = tipo === "PERDIDO" ? texto(dados.microchip, 10) : "";
    const idade = texto(dados.idade, 30);
    const descricao = texto(dados.descricao, 4000);
    const referencia = texto(dados.referencia, 255);
    const dataEvento = texto(dados.dataEvento, 10);
    const cep = texto(dados.cep, 10).replace(/\D/g, "");
    const situacaoLarTemporario = validarSituacaoLarTemporario(tipo, dados.situacaoLarTemporario);
    if (!["PERDIDO", "ENCONTRADO"].includes(tipo) || !["Cachorro", "Gato"].includes(especie) ||
      (tipo === "PERDIDO" && nome.length < 1) || !["", "MACHO", "FEMEA"].includes(sexo) ||
      !["", "PEQUENO", "MEDIO", "GRANDE"].includes(porte) ||
      !["", "SIM", "NAO"].includes(microchip) || !dataValida(dataEvento) ||
      !/^\d{8}$/.test(cep)) {
      return NextResponse.json({ erro: "Preencha os campos essenciais e consulte um CEP válido de Votorantim." }, { status: 400 });
    }
    if (situacaoLarTemporario === undefined) {
      return NextResponse.json({
        erro: tipo === "ENCONTRADO"
          ? "Selecione uma situação válida para o lar temporário."
          : "A situação do lar temporário só pode ser informada para animais encontrados.",
      }, { status: 400 });
    }
    if ((raca && especie === "Gato") || (!/^[\p{L}\p{M}\s.'-]{0,100}$/u.test(nome))) {
      return NextResponse.json({ erro: "Verifique o nome e a raça do animal." }, { status: 400 });
    }
    if (/@|(?:\+?\d[\s().-]*){10,}/.test(descricao + " " + referencia)) {
      return NextResponse.json({ erro: "Não inclua e-mail, telefone ou número de residência na referência e observações." }, { status: 400 });
    }
    const fotos = formulario.getAll("fotos").filter((item): item is File => item instanceof File);
    if (fotos.length > 5 || fotos.some(f => f.size > 5*1024*1024 || f.size === 0)) {
      return NextResponse.json({ erro: "Selecione até cinco fotos, de no máximo 5 MB cada." }, { status: 400 });
    }
    const arquivos: { nome: string; buffer: Uint8Array }[] = [];
    for (const foto of fotos) {
      const bytes = new Uint8Array(await foto.arrayBuffer());
      const extensao = extensaoImagem(bytes);
      if (!extensao || !["image/jpeg", "image/png", "image/webp"].includes(foto.type)) {
        return NextResponse.json({ erro: "Apenas imagens JPG, PNG e WebP são permitidas." }, { status: 400 });
      }
      arquivos.push({ nome: randomUUID() + "." + extensao, buffer: bytes });
    }

    // A coordenada da ocorrência vem exclusivamente da geocodificação do
    // bairro validado no servidor. Coordenadas fornecidas pelo cliente são ignoradas.
    let endereco;
    try {
      endereco = await localizarBairroPorCep(cep);
    } catch (error) {
      if (error instanceof ErroLocalizacao) {
        return NextResponse.json({ erro: error.message }, { status: error.status });
      }
      throw error;
    }
    for (const arquivo of arquivos) {
      const provedor = await salvarFoto(arquivo.nome, arquivo.buffer);
      criadas.push({ nome: arquivo.nome, provedor });
    }

    const resultado = await cadastrarOcorrencia({
      idUsuario: usuario.id, tipo, especie, nome, raca, cor, sexo, porte, microchip,
      idade, descricao, referencia, dataEvento, cep, situacaoLarTemporario, endereco,
      fotos: criadas.map((foto, i) => ({ ...foto, ordem: i + 1 })),
    });
    if ("erro" in resultado) return NextResponse.json({ erro: resultado.erro }, { status: resultado.status });
    concluiu = true;
    return NextResponse.json({
      id: resultado.id, status: "PENDENTE", mensagem: "Ocorrência registrada e enviada para análise.",
    }, { status: 201 });
  } catch (error) {
    console.error("Falha ao registrar ocorrência", error);
    if (error instanceof ErroArmazenamento) {
      return NextResponse.json({ erro: error.message }, { status: 503 });
    }
    return NextResponse.json({ erro: "Não foi possível salvar a ocorrência. Confira os dados e tente novamente." }, { status: 500 });
  } finally {
    if (!concluiu) await Promise.all(criadas.map(foto =>
      excluirFoto(foto.nome, foto.provedor).catch(error => console.warn("Falha ao desfazer upload", error))
    ));
  }
}
