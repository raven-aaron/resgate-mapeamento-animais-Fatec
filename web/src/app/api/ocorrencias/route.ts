import { NextRequest, NextResponse } from "next/server";
import type { ResultSetHeader, RowDataPacket, PoolConnection } from "mysql2/promise";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { banco } from "../../../lib/db";
import { usuarioAtual } from "../../../lib/auth";
import { buscarPublicas } from "../../../lib/ocorrencias";
import { mesmaOrigem } from "../../../lib/seguranca";
import { localizarBairroPorCep, ErroLocalizacao } from "../../../lib/localizacao-cep";

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
  cep?: string; referencia?: string;
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
  const usuario = await usuarioAtual();
  if (!usuario) return NextResponse.json({ erro: "Entre na sua conta antes de registrar um animal.", login: true }, { status: 401 });
  if (Number(request.headers.get("content-length") || 0) > 27 * 1024 * 1024) {
    return NextResponse.json({ erro: "Fotos excedem o limite de tamanho." }, { status: 413 });
  }
  let conexao: PoolConnection | null = null;
  let concluiu = false;
  const caminhos: string[] = [];
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
    const especie = texto(dados.especie, 50);
    const nome = texto(dados.nome, 80);
    const raca = texto(dados.raca, 80);
    const cor = texto(dados.cor, 50);
    const sexo = texto(dados.sexo, 20);
    const porte = texto(dados.porte, 20);
    const microchip = texto(dados.microchip, 10);
    const idade = texto(dados.idade, 30);
    const descricao = texto(dados.descricao, 4000);
    const referencia = texto(dados.referencia, 255);
    const dataEvento = texto(dados.dataEvento, 10);
    const cep = texto(dados.cep, 10).replace(/\D/g, "");
    if (!["PERDIDO", "ENCONTRADO"].includes(tipo) || !["Cachorro", "Gato"].includes(especie) ||
      (tipo === "PERDIDO" && nome.length < 1) || !["", "MACHO", "FEMEA"].includes(sexo) ||
      !["", "PEQUENO", "MEDIO", "GRANDE"].includes(porte) ||
      !["", "SIM", "NAO"].includes(microchip) || !dataValida(dataEvento) ||
      !/^\d{8}$/.test(cep)) {
      return NextResponse.json({ erro: "Preencha os campos essenciais e consulte um CEP válido de Votorantim." }, { status: 400 });
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
    const pasta = join(process.cwd(), "storage", "uploads");
    await mkdir(pasta, { recursive: true });
    for (const arquivo of arquivos) {
      const path = join(pasta, arquivo.nome);
      await writeFile(path, arquivo.buffer, { flag: "wx" });
      caminhos.push(path);
    }

    conexao = await banco().getConnection();
    await conexao.beginTransaction();
    const [bairros] = await conexao.execute<ResultSetHeader>(
      "INSERT INTO bairros (nome,latitude_aproximada,longitude_aproximada) VALUES (?,?,?) ON DUPLICATE KEY UPDATE id_bairro=LAST_INSERT_ID(id_bairro),latitude_aproximada=VALUES(latitude_aproximada),longitude_aproximada=VALUES(longitude_aproximada)",
      [endereco.bairro, endereco.latitude, endereco.longitude]
    );
    const [especies] = await conexao.execute<RowDataPacket[]>(
      "SELECT id_especie AS id FROM especies WHERE nome=? AND ativo=1 LIMIT 1", [especie]
    );
    const idEspecie = Number(especies[0]?.id);
    if (!idEspecie) throw new Error("Espécie não cadastrada");
    let idRaca: number | null = null;
    if (raca) {
      const [racas] = await conexao.execute<RowDataPacket[]>(
        "SELECT id_raca AS id FROM racas WHERE id_especie=? AND nome=? AND ativo=1 LIMIT 1", [idEspecie,raca]
      );
      if (!racas.length) return NextResponse.json({ erro: "Raça inválida para a espécie." }, { status: 400 });
      idRaca = Number(racas[0].id);
    }
    const [animal] = await conexao.execute<ResultSetHeader>(
      "INSERT INTO animais (nome,id_especie,id_raca,sexo,porte,possui_microchip,idade_aproximada,caracteristicas) VALUES (?,?,?,?,?,?,?,?)",
      [nome || null,idEspecie,idRaca,sexo || "INDETERMINADO",porte || "INDETERMINADO",microchip === "" ? null : microchip === "SIM" ? 1 : 0,idade || null,descricao || null]
    );
    const [ocorrencia] = await conexao.execute<ResultSetHeader>(
      "INSERT INTO ocorrencias (id_usuario_criador,id_animal,id_bairro,ponto_referencia,tipo_ocorrencia,status_aprovacao,data_evento,descricao,cep,logradouro,latitude_aproximada,longitude_aproximada,origem_localizacao,precisao_localizacao) VALUES (?,?,?,?,?,'PENDENTE',?,?,?,?,?,?,?,?)",
      [usuario.id,animal.insertId,bairros.insertId,referencia || null,tipo,dataEvento,descricao || null,cep,null,endereco.latitude,endereco.longitude,"BAIRRO","BAIRRO_APROXIMADO"]
    );
    if (cor) {
      const [cores] = await conexao.execute<RowDataPacket[]>("SELECT id_cor AS id FROM cores WHERE nome=? AND ativo=1 LIMIT 1", [cor]);
      if (!cores.length) throw new Error("Cor não cadastrada");
      await conexao.execute("INSERT INTO animais_cores (id_animal,id_cor) VALUES (?,?)", [animal.insertId,Number(cores[0].id)]);
    }
    for (let i=0;i<arquivos.length;i++) {
      await conexao.execute("INSERT INTO fotos_ocorrencias (id_ocorrencia,provedor,identificador_arquivo,url_foto,ordem) VALUES (?,'LOCAL',?,?,?)",
        [ocorrencia.insertId,arquivos[i].nome,"/api/fotos/"+arquivos[i].nome,i+1]);
    }
    await conexao.execute(
      "INSERT INTO historico_ocorrencias (id_ocorrencia,id_usuario_responsavel,acao) VALUES (?,?,'CRIACAO')",
      [ocorrencia.insertId,usuario.id]
    );
    await conexao.commit();
    concluiu = true;
    return NextResponse.json({ id: ocorrencia.insertId, status: "PENDENTE", mensagem: "Ocorrência registrada e enviada para análise." }, { status: 201 });
  } catch (error) {
    console.error("Falha ao registrar ocorrência", error);
    return NextResponse.json({ erro: "Não foi possível salvar a ocorrência. Confira os dados e tente novamente." }, { status: 500 });
  } finally {
    if (conexao) {
      if (!concluiu) await conexao.rollback().catch(() => undefined);
      conexao.release();
    }
    if (!concluiu) await Promise.all(caminhos.map(path => unlink(path).catch(() => undefined)));
  }
}
