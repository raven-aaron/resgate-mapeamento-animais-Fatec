export function mesmaOrigem(request: Request) {
  const origem = request.headers.get("origin");
  if (!origem) return true; // Chamadas de CLI/servidor, sem cookie enviado por formulário cross-origin.
  try { return new URL(origem).host === new URL(request.url).host; }
  catch { return false; }
}
