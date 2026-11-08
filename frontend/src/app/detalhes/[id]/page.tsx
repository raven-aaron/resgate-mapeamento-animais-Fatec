import { notFound, redirect } from "next/navigation";

export default async function DetalhesPetPublico({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[1-9]\d{0,9}$/.test(id)) notFound();
  redirect(`/ocorrencias/${id}`);
}
