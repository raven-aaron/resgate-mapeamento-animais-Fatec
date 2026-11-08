import CustomButton from "../../components/CustomButton";

export default function EntrarPage() {
  return (
    <main className="form-shell">
      <header className="form-heading">
        <span className="eyebrow">Acesse sua conta</span>
        <h1>ENTRAR</h1>
        <p>Escolha como deseja continuar.</p>
      </header>
<section className="form-panel" aria-label="Escolha de acesso">
  {/* Adicionado: grid, grid-flow-col (opcional, para manter lado a lado), justify-center e gap-4 */}
  <div className="action-row grid grid-flow-col justify-center gap-4 w-full">
    <CustomButton href="/admin/login" className="px-4 py-2 flex items-center justify-center">
      Acessar como administrador
    </CustomButton>
    <CustomButton href="/registro-usuario" variant="green" className="px-4 py-2 flex items-center justify-center">
      Acessar como usuário
    </CustomButton>
  </div>
</section>

    </main>
  );
}
