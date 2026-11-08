import type { NextConfig } from "next";

// Rotas autenticadas e consultas MySQL usam renderizacao dinamica convencional.
// Cache Components/Partial Prefetching foram desativados para evitar cache indevido
// de respostas dependentes de sessao e incompatibilidade com route segment config.
const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
};

export default nextConfig;
