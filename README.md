# Bem-Estar Animal — Resgate e Mapeamento (FATEC)

Portal em Next.js 16 + TypeScript e MySQL 8.4 para o módulo de animais perdidos e encontrados de Votorantim/SP. Desenvolvido como Projeto Integrador; **o Compose deste repositório é um ambiente de desenvolvimento/demonstração, não uma implantação pública**.

## O que funciona no módulo Resgate

- Consulta pública de animais somente em `/mapa` (mapa, cartões e filtros). A home não lista ocorrências.
- Cadastro de cidadãos, sessão persistente opcional (até 30 dias), saída e conta pessoal.
- Entrada administrativa exclusivamente pelo link **Área administrativa** no rodapé (`/admin/login`), com sessão independente.
- Registro de animal perdido/encontrado, fotos (até 5), CEP/bairro aproximado, moderação, edição, encerramento e exclusão lógica.
- Histórico, notificações internas, caixa de conversas, chat privado e painel administrativo com indicadores.
- Recuperação por e-mail **somente se** houver provedor Resend e remetente configurados; não é requisito da demonstração local.

## Ambiente DEMO e testes de API

Para gerar usuários, ocorrências, conversas e mensagens **sintéticos no MySQL isolado** e importar 27 requests no Insomnia, consulte [Seed e Insomnia](docs/seed-insomnia.md). O ambiente DEMO usa portas 3001/3308 e não modifica os volumes de desenvolvimento.

## Requisitos locais

- Docker com plugin Docker Compose v2.
- Node.js 24 para rodar o migrador e os scripts de backup no host.
- Git. Consulte [instalação e diagnóstico](docs/ambiente-docker.md).

## Rodar no localhost

Na raiz do repositório, copie `.env.example` para `.env` e defina **senhas fortes distintas** para `MYSQL_ROOT_PASSWORD` e `MYSQL_PASSWORD`. Nunca faça commit de `.env`.

```bash
docker compose up -d --wait mysql
node database/scripts/migrar.mjs
node database/scripts/migrar.mjs --status
docker compose up -d --build web
docker compose ps
```

Abra [http://localhost:3000](http://localhost:3000). Para criar a primeira conta administrativa, use `docker compose exec web node scripts/criar-admin.mjs` e informe os dados no terminal, sem usar senhas padrão.

Para desligar sem perder o banco: `docker compose down`. **Não execute `docker compose down -v` no ambiente com dados**, porque isso exclui os volumes MySQL e fotos.

## Estrutura

- `web/` — aplicação, API, uploads locais, frontend e testes.
- `database/migrations/` — migrações SQL imutáveis, versionadas e executadas pelo migrador.
- `database/scripts/` — migração, backup local e verificação de restauração em contêiner isolado.
- `.github/workflows/` — CI de lint/TypeScript/build, banco e integração HTTP real.
- `docs/` — arquitetura, dicionário, ambiente, recuperação e roteiro do PI.

## Testes e entrega

O CI verifica Next.js, TypeScript, dependências, migrações SQL e APIs reais com MySQL descartável. O teste de integração também cria um backup e tenta restaurá-lo em MySQL temporário. Nenhum desses testes substitui o roteiro manual com três perfis; consulte [demonstração](docs/demonstracao-pi.md) e [validação ponta a ponta](docs/roteiro-validacao-11-11.md).

**Importante:** o GitHub sincroniza código, não o banco local, as fotos nem cookies. O módulo de Banco de Ração, Vacinas e Adoção apresenta páginas provisórias e depende de escopo próprio da equipe.

## Privacidade e segurança

A aplicação não publica telefones, e-mails ou endereços residenciais nos cartazes; usa chat interno e pontos geográficos aproximados. Somente a administração do Resgate modera ocorrências. Suspensões **globais** de contas são intencionalmente indisponíveis a administradores de um módulo; exigem decisão de administração central.

Não publique o servidor de desenvolvimento na Internet. Produção exige HTTPS, persistência externa, proteção contra abuso, segredos, políticas de retenção, backups recorrentes e testes adicionais.

## Trabalho em equipe

Use branches e PRs, execute a CI e documente as alterações de banco em **novos** arquivos de migração. Não reescreva scripts SQL aplicados. O planejamento permanece no Jira da equipe.
