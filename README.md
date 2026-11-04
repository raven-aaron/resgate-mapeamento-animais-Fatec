# Resgate e Mapeamento de Animais

Projeto Integrador da FATEC: portal para registrar, consultar e moderar ocorrências de animais perdidos e encontrados em Votorantim/SP.

**Tecnologias:** Next.js 16 (App Router), React 19, TypeScript, MySQL 8.4 e Docker Compose.

## Funcionalidades

- Mapa e consulta pública de ocorrências aprovadas e abertas.
- Cadastro, login e área do cidadão.
- Registro de perda/encontro, até cinco fotos e localização aproximada por CEP.
- Moderação administrativa, gerenciamento de usuários e indicadores.
- Conversas privadas e notificações.
- Dados fictícios opcionais para demonstrações isoladas.

O projeto usa **ambientes locais de desenvolvimento**. Não está preparado para publicação em produção sem revisão de segurança, hospedagem e persistência.

## Rodar localmente

Pré-requisitos: Git, Docker Desktop/Engine com Compose v2 e Node.js 24.

```powershell
Copy-Item .env.example .env
notepad .env
```

Preencha `MYSQL_ROOT_PASSWORD` e `MYSQL_PASSWORD` com valores fortes e diferentes. Depois, na raiz do projeto:

```powershell
docker compose up -d --wait mysql
node database/scripts/migrar.mjs
docker compose up -d --build web
```

Acesse `http://localhost:3000`. Para criar um administrador, utilize `docker compose exec web node scripts/criar-admin.mjs`.

Para testar com **80 ocorrências fictícias, fotos e contas próprias**, siga o [guia do ambiente DEMO](docs/operacao/dados-demonstracao.md). Ele usa `localhost:3001` e um banco separado do ambiente principal.

Não versionar arquivos `.env`, senhas, bancos nem uploads. `docker compose down` preserva os volumes; `down -v` apaga os dados locais.

## Estrutura

```text
web/
  src/app/             páginas, layouts e endpoints HTTP (App Router)
  src/components/      componentes de interface por domínio
  src/lib/             acesso a dados, autenticação e regras compartilhadas
  scripts/             ferramentas locais e ambiente DEMO
  tests/               testes de segurança e integração

database/
  migrations/          esquema SQL versionado
  scripts/             migração, seed e backup
  tests/               testes de migrações e integridade

insomnia/              coleção de requisições HTTP
docs/                  guias de arquitetura, operação e desenvolvimento
.github/workflows/     pipelines de CI
```

## Código e contratos

- [Banco MySQL e migrações](database/README.md)
- [Rotas HTTP e formatos de requisição](docs/arquitetura/api-http.md)
- [Organização da aplicação](docs/arquitetura/visao-geral.md)

## Colaboração

Para começar no front-end, leia o [guia da equipe](docs/frontend/guia-equipe.md) e a [visão geral da arquitetura](docs/arquitetura/visao-geral.md). Regras de branches, revisão e testes: [CONTRIBUTING.md](CONTRIBUTING.md).

Documentação completa: [docs/README.md](docs/README.md).
