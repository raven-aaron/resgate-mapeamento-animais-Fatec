import type { AppIconName } from "@/components/AppIcon";

export type ItemMenuAdmin = { href: string; label: string; icone: AppIconName };
export type ModuloMenuAdmin = {
  id: string;
  titulo: string;
  icone: AppIconName;
  itens: ItemMenuAdmin[];
};

export const modulosMenuAdmin: ModuloMenuAdmin[] = [
  {
    id: "resgate",
    titulo: "Resgate e Mapeamento",
    icone: "location",
    itens: [
      { href: "/admin", label: "Painel geral", icone: "dashboard" },
      {
        href: "/admin/solicitacoes",
        label: "Solicitações pendentes",
        icone: "clock",
      },
      {
        href: "/admin/ocorrencias",
        label: "Animais cadastrados",
        icone: "pets",
      },
      {
        href: "/admin/estatisticas",
        label: "Estatísticas",
        icone: "statistics",
      },
      { href: "/admin/mapa-termico", label: "Mapa térmico", icone: "map" },
      { href: "/admin/usuarios", label: "Contas cadastradas", icone: "users" },
      {
        href: "/admin/cadastro-animal",
        label: "Cadastrar animal encontrado",
        icone: "addCircle",
      },
      { href: "/mensagens", label: "Mensagens recebidas", icone: "mail" },
      { href: "/notificacoes", label: "Notificações", icone: "clock" },
    ],
  },
];
