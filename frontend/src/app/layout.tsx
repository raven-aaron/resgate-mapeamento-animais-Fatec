import type { Metadata } from "next";
import FinalSiteShell from "../components/FinalSiteShell";
import "bootstrap/dist/css/bootstrap.min.css";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resgate e Mapeamento de Animais | Votorantim",
  description: "Encontre animais perdidos e encontrados em Votorantim. Cadastre ocorrências, consulte o mapa e entre em contato de forma segura.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <FinalSiteShell>
          {children}
        </FinalSiteShell>
      </body>
    </html>
  );
}
