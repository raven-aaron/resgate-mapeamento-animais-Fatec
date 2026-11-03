import { NextResponse } from "next/server";
import type { ResultSetHeader } from "mysql2/promise";
import { banco } from "../../../../lib/db";
import { criarSessao, gerarSenhaHash } from "../../../../lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 4096) return NextResponse.json({ erro: "Dados muito extensos." }, { status: 413 });
    const data = await request.json();
    const nome = typeof data.nome === "string" ? data.nome.trim() : "";
    const email = typeof data.email === "string" ? data.email.trim().toLowerCase() : "";
    const senha = typeof data.senha === "string" ? data.senha : "";
    if (nome.length < 2 || nome.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || senha.length < 10 || senha.length > 128) {
      return NextResponse.json({ erro: "Informe nome, e-mail válido e senha entre 10 e 128 caracteres." }, { status: 400 });
    }
    const hash = await gerarSenhaHash(senha);
    const [resultado] = await banco().execute<ResultSetHeader>(
      "INSERT INTO usuarios (nome,email,senha_hash) VALUES (?,?,?)", [nome, email, hash]
    );
    await criarSessao(resultado.insertId);
    return NextResponse.json({ ok: true, nome }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ erro: "E-mail já cadastrado." }, { status: 409 });
    }
    console.error("Cadastro de usuário falhou", error);
    return NextResponse.json({ erro: "Não foi possível concluir o cadastro." }, { status: 500 });
  }
}
