import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Resgate Animal | Votorantim",
  description: "Registro e mapeamento de animais perdidos e encontrados em Votorantim/SP.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <header className="site-header">
          <div className="site-wrap site-header-inner">
            <Link className="site-brand" href="/" aria-label="Resgate Animal, página inicial">
              <span className="site-brand-icon" aria-hidden="true">🐾</span>
              <span>Resgate <strong>Animal</strong><small>Votorantim • SP</small></span>
            </Link>
            <nav className="site-nav" aria-label="Navegação principal">
              <Link href="/">Início</Link>
              <Link href="/ocorrencias/nova">Cadastrar ocorrência</Link>
              <Link href="/localizacao">Testar localização</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="site-wrap">
            <strong>Resgate Animal</strong>
            <p>Projeto Integrador acadêmico. As ocorrências públicas dependerão de aprovação administrativa. Não compartilhe endereços residenciais ou contatos pessoais.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
