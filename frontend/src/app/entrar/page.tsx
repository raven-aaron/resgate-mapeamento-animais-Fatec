import CustomButton from "../../components/CustomButton";
import FormPage, { FormPanel } from "../../components/FormPage";

export default function EntrarPage() {
  return (
    <FormPage
      eyebrow="Acesse sua conta"
      title="ENTRAR"
      description="Escolha como deseja continuar."
    >
      <FormPanel aria-label="Escolha de acesso">
        <div className="action-row">
          <CustomButton href="/admin/login">
            Acessar como administrador
          </CustomButton>
          <CustomButton href="/registro-usuario" variant="green">
            Acessar como usuário
          </CustomButton>
        </div>
      </FormPanel>
    </FormPage>
  );
}
