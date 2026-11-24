import { NextResponse } from "next/server";
import { buscarPublicaPorId } from "../../../../lib/ocorrencias";
import { usuarioAtual } from "../../../../lib/auth";
import { mesmaOrigem } from "../../../../lib/seguranca";
import { ErroLocalizacao, localizarBairroPorCep } from "../../../../lib/localizacao-cep";
import { atualizarCadastroOcorrencia, excluirCadastroOcorrencia } from "../../../../models/edicao-ocorrencias";

export const runtime = "nodejs";
type Contexto = { params: Promise<{ id: string }> };
const padraoId = /^[1-9]\d{0,9}$/;

function respostaErro(mensagem: string, status: number) {
  return NextResponse.json({ erro: mensagem }, { status });
}

export async function GET(_request: Request, context: Contexto) {
  const { id } = await context.params;
  if (!padraoId.test(id)) return respostaErro("Identificador inválido.", 400);
  try {
    const ocorrencia = await buscarPublicaPorId(Number(id));
    if (!ocorrencia) return respostaErro("Ocorrência não encontrada.", 404);
    return NextResponse.json({ ocorrencia }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return respostaErro("Erro na consulta da ocorrência.", 500);
  }
}

async function atualizarOcorrencia(request: Request, context: Contexto, metodo: "PATCH" | "PUT") {
  if (!mesmaOrigem(request)) return respostaErro("Origem não permitida.", 403);
  const usuario = await usuarioAtual();
  if (!usuario) return respostaErro("Entre na sua conta para gerenciar esta ocorrência.", 401);
  const { id: identificador } = await context.params;
  if (!padraoId.test(identificador)) return respostaErro("Identificador inválido.", 400);
  if (Number(request.headers.get("content-length") || 0) > 12000) return respostaErro("Dados muito extensos.", 413);
  try {
    const dados = await request.json() as Record<string, unknown>;
    if (!dados || typeof dados !== "object" || Array.isArray(dados)) return respostaErro("Dados inválidos.", 400);
    if (metodo === "PUT" && dados.acao !== undefined && dados.acao !== "EDITAR")
      return respostaErro("Ação incompatível com PUT.", 400);
    const acao = metodo === "PUT" ? "EDITAR" : dados.acao;
    if (acao !== "EDITAR" && acao !== "ENCERRAR") return respostaErro("Ação inválida.", 400);

    let regiaoNova: Awaited<ReturnType<typeof localizarBairroPorCep>> | null = null;
    if (acao === "EDITAR" && dados.cep !== undefined) {
      if (typeof dados.cep !== "string") return respostaErro("Informe um CEP válido.", 400);
      try {
        regiaoNova = await localizarBairroPorCep(dados.cep);
      } catch (error) {
        if (error instanceof ErroLocalizacao) return respostaErro(error.message, error.status);
        throw error;
      }
    }
    const resultado = await atualizarCadastroOcorrencia(Number(identificador), usuario.id, acao, dados, regiaoNova);
    if ("erro" in resultado) return respostaErro(resultado.erro, resultado.status);
    return NextResponse.json({ ok: true, mensagem: resultado.mensagem });
  } catch (error) {
    console.error("Falha ao atualizar ocorrência", error);
    return respostaErro("Não foi possível atualizar a ocorrência.", 500);
  }
}

export async function PATCH(request: Request, context: Contexto) {
  return atualizarOcorrencia(request, context, "PATCH");
}
export async function PUT(request: Request, context: Contexto) {
  return atualizarOcorrencia(request, context, "PUT");
}

export async function DELETE(request: Request, context: Contexto) {
  if (!mesmaOrigem(request)) return respostaErro("Origem não permitida.", 403);
  const usuario = await usuarioAtual();
  if (!usuario) return respostaErro("Entre na sua conta.", 401);
  const { id: identificador } = await context.params;
  if (!padraoId.test(identificador)) return respostaErro("Identificador inválido.", 400);
  try {
    const resultado = await excluirCadastroOcorrencia(Number(identificador), usuario.id);
    if ("erro" in resultado) return respostaErro(resultado.erro, resultado.status);
    return NextResponse.json({ ok: true, mensagem: "Cadastro removido das listagens." });
  } catch (error) {
    console.error("Falha ao excluir ocorrência", error);
    return respostaErro("Não foi possível excluir a ocorrência.", 500);
  }
}
