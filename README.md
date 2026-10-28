# Resgate e Mapeamento de Animais — FATEC

Projeto Integrador desenvolvido para o cadastro, acompanhamento e mapeamento aproximado de ocorrências de animais perdidos e encontrados.

## Tecnologias planejadas

- Next.js (App Router) com TypeScript
- MySQL
- Docker Compose para ambiente de desenvolvimento
- GitHub Actions para integração contínua

## Regras essenciais de privacidade

- A localização pública deve ser aproximada (bairro, cidade, UF e referência não residencial).
- Telefones e e-mails de usuários **não** devem ser divulgados nas ocorrências públicas.
- A comunicação entre usuários deve ocorrer exclusivamente pelo chat interno autenticado.
- A aprovação administrativa determina quais ocorrências podem ser exibidas publicamente.

## Estado do repositório

Repositório novo, em fase de estruturação. O código da aplicação, as migrações SQL e as automações serão adicionados em etapas por meio de Pull Requests.

## Organização prevista

- `web/`: aplicação Next.js full-stack
- `database/migrations/`: alterações versionadas do banco MySQL
- `database/seeds/`: dados fictícios de teste
- `docs/`: documentação técnica e de ambiente
- `.github/workflows/`: automações de CI

## Colaboração

Cada integrante deve desenvolver em uma branch própria e propor alterações por Pull Request. Não adicionar senhas, tokens, dados pessoais reais ou arquivos `.env.local` ao repositório.

O planejamento do trabalho é acompanhado no Jira do grupo.

## Desenvolvimento local com Docker

O ambiente local do projeto utiliza `compose.yaml` para iniciar **Next.js (Node.js 24)** e **MySQL 8.4.13** de forma padronizada.

Consulte [o guia de ambiente Docker](docs/ambiente-docker.md) para instalar o Docker Desktop, criar o seu `.env` local e executar `docker compose up --build`.

A proposta de banco, as migrações e os testes estão em [database/README.md](database/README.md). Consulte também o [modelo revisado](docs/modelo-banco.md) e o [contrato de integração dos módulos](docs/integracao-modulos.md). As rotas da aplicação e a integração com a hospedagem ainda serão implementadas.
