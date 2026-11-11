import Link from "next/link";
import CartazPet from "./CartazPet";
import { buscarFotosOcorrencia, buscarPublicas } from "../../lib/ocorrencias";

export default async function CartazTipoMaisRecente({ tipo }: { tipo: "PERDIDO" | "ENCONTRADO" }) {
  const [ocorrencia] = await buscarPublicas({ tipo });
  if (!ocorrencia) {
    return (
      <main className="site-wrap">
        <p className="note">Ainda não há uma ocorrência aprovada e aberta nesta categoria.</p>
        <Link href="/mapa">Consultar mapa</Link>
      </main>
    );
  }

  const fotos = await buscarFotosOcorrencia(ocorrencia.id);
  return (
    <main>
      <CartazPet o={ocorrencia} fotos={fotos} />
    </main>
  );
}
