import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import SiteChrome from "../components/layout/SiteChrome";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Resgate e Mapeamento de Animais | Votorantim",
  description: "Encontre animais perdidos e encontrados em Votorantim. Cadastre ocorrências, consulte o mapa e entre em contato de forma segura.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={outfit.variable}>
      <body>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
