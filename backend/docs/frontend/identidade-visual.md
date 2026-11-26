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

## Hierarquia semântica das ações em toda a aplicação

O componente `CustomButton` concentra cinco variantes. Não escolher a variante pela cor dos botões próximos; escolher pelo **efeito real da ação**:

| Variante | Uso | Exemplos |
| --- | --- | --- |
| `green` | Ação afirmativa principal, gravação ou mudança de estado positiva | SALVAR, PRÓXIMO, CADASTRAR, ACEITAR, MARCAR COMO RESOLVIDA, ENVIAR |
| `orange` | Chamada de atenção, destino principal de consulta ou correção prioritária | PERDI MEU PET, VER NO MAPA, VER PUBLICAÇÃO, CORRIGIR E REENVIAR |
| `gray` | Navegação de retorno, operação utilitária ou saída neutra de modal | VOLTAR, ATUALIZAR LISTA, LIMPAR FILTROS, FECHAR |
| `outline` | Acesso secundário/terciário sem alterar dados ou controle não selecionado | NOTIFICAÇÕES, ABRIR, FILTROS, alternância não selecionada |
| `red` | Ação destrutiva, abandono de preenchimento ou encerramento de sessão | EXCLUIR, REMOVER FOTO, CANCELAR CADASTRO, SAIR |

**Regras de composição:** quando várias ações diferentes aparecem no mesmo grupo, indicar claramente a hierarquia, sem várias ações principais idênticas. Um grupo pode conter controle primário colorido, navegação neutra e saída destrutiva. Controles com a **mesma função** podem compartilhar cor: teclas de acessibilidade, setas da galeria e páginas de paginação não precisam receber cores artificiais. Em filtros/toggles, a seleção ativa é verde e a inativa pode ser cinza ou contorno; manter `aria-pressed`.

**CANCELAR depende do contexto:** fechar um modal de confirmação sem executar a ação é cinza (seguro); abandonar um cadastro já preenchido é vermelho, com confirmação antes de limpar dados quando aplicável. Fechar menu ou navegar de volta **não** é destrutivo e nunca deve usar vermelho.

O contorno é contrastante em tema claro e alto contraste; foco de teclado usa destaque visível. Consultar [a auditoria de botões](auditoria-botoes.md) para os grupos por área. Os testes Jest `hierarquia-botoes.jest.cjs` cobrem os principais casos.

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
