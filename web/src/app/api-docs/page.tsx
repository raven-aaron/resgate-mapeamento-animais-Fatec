import { redirect } from "next/navigation";

/** Entrada curta e estável para a documentação Swagger UI estática. */
export default function ApiDocsPage() {
  redirect("/swagger/index.html");
}
