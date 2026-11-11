import { redirect } from "next/navigation";
import AdminShell from "../../../components/admin/AdminShell";
import RegistroPetFinal from "../../../components/RegistroPetFinal";
import { administradorAtual } from "../../../lib/auth";
import styles from "../../registro-pet-encontrado/registro-pet-encontrado.module.css";

export const dynamic = "force-dynamic";

export default async function CadastroAnimalAdministrativo() {
  const usuario = await administradorAtual();
  if (!usuario?.adminResgate) redirect("/admin/login");

  return <AdminShell nome={usuario.nome} titulo="CADASTRO DE ANIMAL">
    <RegistroPetFinal tipo="ENCONTRADO" styles={styles} />
  </AdminShell>;
}
