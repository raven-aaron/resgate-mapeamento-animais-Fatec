import { notFound } from "next/navigation";
import CartazPet from "../../../components/ocorrencias/CartazPet";
import { buscarFotosOcorrencia, buscarPublicaPorId } from "../../../lib/ocorrencias";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function CartazPublico({ params }: Props) {
  const { id } = await params;
  if (!/^[1-9]\d{0,9}$/.test(id)) notFound();

  const ocorrencia = await buscarPublicaPorId(Number(id));
  if (!ocorrencia) notFound();

  const fotos = await buscarFotosOcorrencia(Number(id));

  return (
    <main>
      <CartazPet o={ocorrencia} fotos={fotos} />
    </main>
  );
}
