import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { gerarSenhaHash } from "../../../../lib/auth";
import { mesmaOrigem } from "../../../../lib/seguranca";
import { redefinirSenha } from "../../../../models/recuperacao-senha";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!mesmaOrigem(request)) return NextResponse.json({ erro: "Origem inválida." }, { status: 403 });
  try {
    if (Number(request.headers.get("content-length") || 0) > 4096) return NextResponse.json({ erro: "Dados inválidos." }, { status: 413 });
    const dados = await request.json();
    const token = typeof dados.token === "string" ? dados.token : "";
    const senha = typeof dados.senha === "string" ? dados.senha : "";
    if (!/^[a-f0-9]{64}$/.test(token) || senha.length < 10 || senha.length > 128)
      return NextResponse.json({ erro: "Link inválido ou senha fora do limite de 10 a 128 caracteres." }, { status: 400 });
    const hashToken = createHash("sha256").update(token).digest("hex");
    const novaSenha = await gerarSenhaHash(senha);
    const atualizado = await redefinirSenha(hashToken, novaSenha);
    if (!atualizado) return NextResponse.json({ erro: "O link de recuperação expirou ou já foi utilizado." }, { status: 400 });
    return NextResponse.json({ mensagem: "Senha atualizada. Faça login com a nova senha." });
  } catch (error) {
    console.error("Falha ao redefinir senha", error);
    return NextResponse.json({ erro: "Não foi possível redefinir a senha." }, { status: 500 });
  }
}
