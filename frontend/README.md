# Aplicação Next.js

Interface e API HTTP do Resgate e Mapeamento de Animais.

## Onde desenvolver

| Pasta | Responsabilidade |
| --- | --- |
| `src/app/` | Páginas, layouts, navegação e rotas `/api` |
| `src/components/` | Componentes reutilizáveis de interface, agrupados por domínio |
| `src/models/` | Consultas SQL e transações com o MySQL |
| `src/lib/` | Autenticação, validações e funções compartilhadas |
| `src/types/` | Declarações adicionais de tipos |
| `public/assets/` | Imagens estáticas do projeto |
| `scripts/` | Administração local, versões e enriquecimento DEMO |
| `tests/` | Testes automatizados |

No Next.js, `page.tsx` define uma página e `route.ts` define uma rota da API. Consultas SQL e sessões ficam no servidor.

A equipe de interface deve começar por `src/components/` e pelos estilos de `src/app/`, sem alterar a API ou o banco sem combinar o contrato.

## Páginas principais

| Rota | Uso |
| --- | --- |
| `/` | Página inicial |
| `/entrar` | Encaminha o cidadão ao login público |
| `/registro-usuario`, `/cadastro`, `/login` | Cadastro e autenticação do cidadão |
| `/mapa` | Consulta pública e mapa |
| `/ocorrencias/nova` | Cadastro de perda ou encontro |
| `/ocorrencias/[id]` | Cartaz da ocorrência |
| `/minha-conta`, `/minhas-ocorrencias`, `/mensagens`, `/notificacoes` | Área autenticada |
| `/admin/login` | Entrada administrativa por URL direta, sem link público; exige permissão ADMIN no módulo Resgate |
| `/admin/*` | Painel e operações restritos a administradores; o link do painel só aparece no menu para uma sessão administrativa válida, e as páginas e APIs também verificam a permissão no servidor |

## Executar e validar

Prefira o [Docker Compose da raiz](../backend/docs/operacao/docker.md). Para executar os testes de código em `frontend/`, instale Node.js 24:

```bash
npm ci
npm run check:versions
npm run test:origem
npm run test:fotos
npm run test:jest
npm run test:regras
npm run test:openapi
npm run lint
npx next typegen
npx tsc --noEmit
npm run build
```

A integração HTTP (`tests/integracao-http.mjs`) **cria dados**; não execute contra um banco pessoal. A CI utiliza MySQL descartável.

Contratos HTTP: [Swagger](../backend/docs/arquitetura/swagger.md) e [lista de rotas](../backend/docs/arquitetura/api-http.md).

Guia prático de front-end: [guia da equipe](../backend/docs/frontend/guia-equipe.md).
