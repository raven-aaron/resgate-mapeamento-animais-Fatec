"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export default function LogoutButton({destino="/admin/login",texto="Sair da administração"}:{destino?:string;texto?:string}={}) {
  const router = useRouter();
  const [saindo,setSaindo] = useState(false);
  const [erro,setErro] = useState("");
  async function sair() {
    setSaindo(true);setErro("");
    try {
      const resposta = await fetch("/api/auth/logout", { method:"POST" });
      if(!resposta.ok) throw new Error("Falha ao sair");
      window.dispatchEvent(new Event("resgate-auth"));
      router.replace(destino);
      router.refresh();
    } catch {setErro("Não foi possível encerrar a sessão. Tente novamente.");setSaindo(false);}
  }
  return <div><button type="button" onClick={sair} disabled={saindo} className="action action-secondary">{saindo?"Saindo...":texto}</button>
    {erro&&<p role="alert" className="note note-warning">{erro}</p>}</div>;
}
