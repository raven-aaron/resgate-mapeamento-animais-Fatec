import { redirect } from "next/navigation";
// A seleção do CEP fica exclusivamente no formulário de registro.
// Esta rota antiga redireciona à consulta pública de animais.
export default function LocalizacaoPage() { redirect("/mapa"); }
