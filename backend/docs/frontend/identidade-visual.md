# Identidade visual — referência oficial do PI do primeiro semestre

Fonte de referência: [Projeto-Resgate-e-Mapeamento-FATEC](https://github.com/raven-aaron/Projeto-Resgate-e-Mapeamento-FATEC), pasta \`ProjetoNext\`, branch \`main\`.

## Padrão de marca preservado

- Fonte: **Outfit**, carregada por `@import` do Google Fonts em `frontend/src/app/final-globals.css`.
- Verde-água / petróleo: \`#348888\`.
- Verde-água claro: \`#D5F1EF\`.
- Ciano-claro das barras de navegação e rodapé: \`#9EF8EE\`.
- Ciano-médio: \`#22BABB\`.
- Laranja dos botões principais: \`#FA7F08\`.
- Vermelho de destaque: \`#F24405\`.
- Texto escuro: \`#2D2D2D\`.
- Cinza: \`#707070\`.
- Fundo geral: \`#FBF9F7\`.

## Elementos que devem ser reutilizados

- Barra superior de acessibilidade.
- Cabeçalho branco com marca do Bem-Estar Animal, busca e logotipo da Prefeitura.
- Navegação sobre fundo ciano-claro, com botão de menu lateral verde-água.
- Página inicial com os títulos "PERDI O MEU PET" e "O MAPA E RESGATES", imagens originais, botões laranja e imagens com borda verde-água.
- Rodapé de duas faixas: ciano-claro e verde-água.
- Títulos de formulários verde-água, botões principais laranja.

Os arquivos \`frontend/public/assets/cachorrogatoinicial.jpg\`, \`cachorrogato2.jpg\` e \`logo_prefeituraVotorantim.png\` foram copiados do repositório antigo.

O logotipo \`logo_Bem-EstarAnimal_2.png\` está em \`frontend/public/assets/\`; o cabeçalho e o rodapé ativos o carregam pelo caminho local \`/assets/logo_Bem-EstarAnimal_2.png\`. A pendência de portabilidade offline foi resolvida.

## Adaptação à aplicação atual

A identidade visual deve permanecer; os componentes Next.js atuais devem usar as novas rotas, a autenticação e as APIs MySQL, sem importar mocks estáticos nem divulgar dados pessoais. Não reaproveitar links fictícios para funcionalidades ainda não implementadas. O frontend do primeiro semestre não será copiado indiscriminadamente para não sobrescrever o banco, a infraestrutura ou a estrutura funcional atual.
