# Aplicação web — Resgate de Animais

Next.js 16 (App Router), TypeScript, React e driver MySQL 8.4. A aplicação é iniciada pelo Docker Compose na raiz do repositório.

**Guia principal:** [README raiz](../README.md) • [Docker e migrações](../docs/ambiente-docker.md).

## Rotas

- `/` — portal, sem listagem de ocorrências.
- `/resgate` — registrar perda/encontro e acessar o mapa.
- `/mapa` — listagem pública de ocorrências aprovadas.
- `/cadastro`, `/login`, `/minha-conta`, `/minhas-ocorrencias` — cidadãos.
- `/mensagens`, `/notificacoes` — chat e avisos do cidadão.
- `/admin/login` — login separado de administrador (link no rodapé).
- `/admin/*` — moderação, contas e indicadores.

## Ambiente

Prefira executar pelo Compose da raiz: `docker compose up -d --build web`. O contêiner usa Node 24 e conecta-se ao host `mysql` na rede Docker. Para executar sem Compose, configure um MySQL 8.4 já migrado e as variáveis `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`.

## Verificações locais

Dentro de `web/` com Node 24 e dependências instaladas:

```bash
npm ci
npm run check:versions
npm run test:origem
npm run test:fotos
npm run lint
npx tsc --noEmit
npm run build
```

O teste `web/tests/integracao-http.mjs` **não deve ser executado contra o banco de desenvolvimento**: ele cria usuários e ocorrências de teste. A CI o executa apenas em contêineres descartáveis, juntamente com backup e teste de restauração.

O upload atual usa o volume `media_data` (`/app/storage/uploads`) e não deve ser tratado como armazenamento de produção.
