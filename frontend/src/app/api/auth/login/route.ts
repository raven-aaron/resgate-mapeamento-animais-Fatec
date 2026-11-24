import { NextResponse } from "next/server";
import { compararSenha, criarSessao } from "../../../../lib/auth";
import { mesmaOrigem } from "../../../../lib/seguranca";
import { buscarUsuarioAtivoPorEmail } from "../../../../models/usuarios";

export const runtime = "nodejs";
const tentativas = new Map<string, { qtd: number; expira: number }>();

export async function POST(request: Request) {
  if (!mesmaOrigem(request)) return NextResponse.json({ erro: "Origem não permitida." }, { status: 403 });
  const ip = (request.headers.get("x-forwarded-for") || "").split(",")[0].trim().slice(0, 70) || "local";
  const agora = Date.now();
  const dadosRate = tentativas.get(ip);
  if (dadosRate && dadosRate.expira > agora && dadosRate.qtd >= 12) {
    return NextResponse.json({ erro: "Muitas tentativas. Tente novamente mais tarde." }, { status: 429 });
  }
  try {
    if (Number(request.headers.get("content-length") || 0) > 4096) return NextResponse.json({ erro: "Dados inválidos." }, { status: 413 });
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const senha = typeof body.senha === "string" ? body.senha : "";
    if (!email || !senha || senha.length > 128) return NextResponse.json({ erro: "Informe e-mail e senha." }, { status: 400 });
    const usuario = await buscarUsuarioAtivoPorEmail(email);
    const valido = usuario && await compararSenha(senha, String(usuario.senha_hash));
    if (!valido || (body.admin === true && Number(usuario.adminResgate) !== 1)) {
      const anterior = dadosRate && dadosRate.expira > agora ? dadosRate.qtd : 0;
      if (tentativas.size > 2000) tentativas.clear();
      tentativas.set(ip, { qtd: anterior + 1, expira: agora + 15 * 60_000 });
      return NextResponse.json({ erro: "Credenciais inválidas ou acesso não autorizado." }, { status: 401 });
    }
    tentativas.delete(ip);
    const perfil = body.admin === true ? "administrador" : "cidadao";
    await criarSessao(Number(usuario.id), perfil === "cidadao" && body.manterConectado === true, perfil);
    return NextResponse.json({ ok: true, adminResgate: Boolean(usuario.adminResgate) });
  } catch (error) {
    console.error("Erro ao autenticar", error);
    return NextResponse.json({ erro: "Não foi possível autenticar." }, { status: 500 });
  }
}
