"use client";

import { useState } from "react";
import Footer from "./Footer/Footer";
import Navbar from "./Navbar/Navbar";
import Sidebar from "./Sidebar/Sidebar";
import IdentificacaoConectada from "./layout/IdentificacaoConectada";

export default function FinalSiteShell({ children }: { children: React.ReactNode }) {
  const [sidebarAberta, setSidebarAberta] = useState(false);

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
