"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Footer from "./Footer/Footer";
import Navbar from "./Navbar/Navbar";
import Sidebar from "./Sidebar/Sidebar";
import IdentificacaoConectada from "./layout/IdentificacaoConectada";

export default function FinalSiteShell({ children }: { children: React.ReactNode }) {
  const [sidebarAberta, setSidebarAberta] = useState(false);
  const pathname = usePathname() ?? "";

  //Retirando o footer e header do menu administrativo
  const rotaAdmin =
    (pathname === "/admin" || pathname.startsWith("/admin/")) && pathname !== "/admin/login";
    if (rotaAdmin) return <>{children}</>;

  return (
    <>
      <Navbar onMenuClick={() => setSidebarAberta(true)} />
      <IdentificacaoConectada />
      <Sidebar isOpen={sidebarAberta} onClose={() => setSidebarAberta(false)} />
      {children}
      <Footer />
    </>
  );
}
