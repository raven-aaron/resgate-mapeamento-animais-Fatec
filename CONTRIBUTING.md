# Contribuição

## Processo

1. Atualize a `main`: `git switch main` e `git pull --ff-only`.
2. Abra uma branch para a tarefa (`feat/`, `fix/`, `refactor/`, `docs/` ou `chore/`).
3. Faça commits com escopo claro, por exemplo `feat(mapa): adicionar filtro de bairros`.
4. Valide o código e abra um pull request para `main`.
5. Aguarde a CI e uma revisão antes de integrar.

Não altere diretamente a `main` para desenvolver funcionalidades. Mudanças de rotas, contratos HTTP e banco precisam ser combinadas entre as frentes.

## Responsabilidades

- **Front-end:** páginas, componentes, estados de interface, acessibilidade, CSS e responsividade.
- **Back-end:** APIs, autenticação, autorização, validações e regras de publicação.
- **Banco:** novas migrações, integridade e consultas.
- **Infraestrutura e qualidade:** Docker, CI, testes e documentação de execução.

Essa divisão indica a responsabilidade principal, não um bloqueio de colaboração. Quando um recurso cruza áreas, explique a integração no PR.

## Regras de segurança e compatibilidade

- Não envie `.env`, senhas, fotos de usuários ou backups.
- Nunca reescreva migrações aplicadas; crie uma nova migração.
- Não desative verificações de permissão para facilitar um teste visual.
- A API e o banco de demonstração não devem ser confundidos com dados reais.
- Preserve as rotas e o contrato de autenticação ao alterar componentes.

## Testes

No diretório `web/`, execute:

```bash
npm ci
npm run check:versions
npm run test:origem
npm run test:fotos
npm run lint
npx tsc --noEmit
npm run build
```

A CI executa também testes de MySQL, APIs HTTP e seed em contêineres independentes. Não execute testes de integração que criam dados em bancos pessoais.

Guias: [estrutura do projeto](docs/arquitetura/visao-geral.md) e [equipe de front-end](docs/frontend/guia-equipe.md).
