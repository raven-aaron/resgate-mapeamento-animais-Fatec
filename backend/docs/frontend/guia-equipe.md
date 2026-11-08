# Guia da equipe de front-end

## Primeiro acesso

1. Clone o repositório e configure o Docker pelo [guia de instalação](../operacao/docker.md).
2. Suba o projeto e abra `http://localhost:3000` ou utilize o [ambiente DEMO](../operacao/dados-demonstracao.md) na porta `3001`.
3. Faça um cadastro como cidadão e explore `/mapa`, `/minhas-ocorrencias` e a área administrativa com uma conta de teste.
4. Antes de mudar componentes, confirme o fluxo e o endpoint utilizado na página.

## Organização da interface

| Onde | O que editar |
| --- | --- |
| `frontend/src/app/page.tsx` e `home.module.css` | Página inicial |
| `frontend/src/components/layout/` | Cabeçalho, menu, rodapé e conta conectada |
| `frontend/src/components/ocorrencias/` | Cartaz, mapa, filtros, formulários e galerias |
| `frontend/src/components/auth/` | Entrada, saída e componentes de autenticação |
| `frontend/src/components/admin/` | Interface de moderação |
| `frontend/src/components/chat/` | Lista de conversas e mensagens |
| `frontend/src/components/notificacoes/` | Avisos e estado de leitura |
| `frontend/src/app/globals.css` | Tokens visuais e padrões globais |

As rotas de navegação ficam em `frontend/src/app/`. Componentes com estado, eventos ou APIs do navegador precisam de `"use client"`; busque evitar isso em componentes de servidor que só renderizam conteúdo.

## Convenções

- Use nomes que descrevam a responsabilidade real do arquivo. Componentes React em `PascalCase`; variáveis e funções em `camelCase`.
- Extraia um componente apenas quando for reutilizado ou quando melhorar uma tela grande. Não crie uma pasta para cada elemento pequeno.
- Prefira CSS Modules para estilos específicos e mantenha tokens e estilos comuns em `globals.css`.
- Preserve atributos de acessibilidade, estados de carregamento, erro e vazio.
- Mostre os textos adequados a `PERDIDO` e `ENCONTRADO`, inclusive no cadastro e no cartaz.
- Não exponha telefone/e-mail nem coordenada exata do usuário. O contato entre pessoas ocorre pelo chat interno.
- Não use dados fixos no componente para simular o funcionamento do servidor. O DEMO já oferece dados para testar telas.

## Integração com a API

Os endpoints em `frontend/src/app/api/` são contratos do servidor. O formulário deve enviar os campos esperados e lidar com as respostas de erro. Não altere autenticação, SQL ou resposta de endpoint em um PR exclusivamente visual.

| Área | Endpoint base |
| --- | --- |
| Ocorrências | `/api/ocorrencias` |
| Sessão do cidadão | `/api/auth/me` |
| Sessão administrativa | `/api/auth/admin/me` |
| Mensagens | `/api/conversas` |
| Notificações | `/api/notificacoes` |
| Localização | `/api/localizacao/cep` |

Para inspecionar exemplos reais de requisição, importe `backend/insomnia/resgate-demo.insomnia-v4.json` e consulte a [documentação DEMO](../operacao/dados-demonstracao.md).

## Antes de abrir um PR

```bash
cd web
npm ci
npm run lint
npx tsc --noEmit
npm run build
```

Valide no navegador uma tela pública, um fluxo de cidadão e uma tela administrativa quando a alteração afetar layout compartilhado. Verifique também as larguras de celular e desktop.

**Não modifique um banco compartilhado para testar interfaces.** Use o DEMO local. Consulte as regras de colaboração em [CONTRIBUTING.md](../../../CONTRIBUTING.md).
