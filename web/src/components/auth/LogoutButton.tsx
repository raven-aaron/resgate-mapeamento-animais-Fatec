"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export default function LogoutButton({destino="/admin/login",texto="Sair da administração"}:{destino?:string;texto?:string}={}) {
  const router = useRouter();
  const [saindo,setSaindo] = useState(false);
  async function sair() {
    setSaindo(true);
    try {
      const resposta = await fetch("/api/auth/logout", { method:"POST" });
      if(!resposta.ok) throw new Error("Falha ao sair");
      window.dispatchEvent(new Event("resgate-auth"));
      router.replace(destino);
      router.refresh();
    } catch {setSaindo(false);}
  }
  return <button type="button" onClick={sair} disabled={saindo} className="action action-secondary">{saindo?"Saindo...":texto}</button>;
}
