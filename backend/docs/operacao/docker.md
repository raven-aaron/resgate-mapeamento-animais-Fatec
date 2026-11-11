# Ambiente Docker, migrações e operação local

## Pré-requisitos

Docker Engine/Desktop com `docker compose` v2, Git e Node.js 24 no host. Funciona em Linux, Windows (WSL2/PowerShell) e macOS. Execute comandos a partir da **raiz do repositório**.

1. Crie `.env` copiando `.env.example` (`cp .env.example .env` em Linux/macOS, `Copy-Item .env.example .env` em PowerShell).
2. Configure `MYSQL_ROOT_PASSWORD` e `MYSQL_PASSWORD` com senhas fortes diferentes. Não compartilhe nem versione o arquivo `.env`.
3. Use somente as portas locais padrão: web em `127.0.0.1:3000`; MySQL em `127.0.0.1:3307`. Dentro do Compose, a aplicação usa `mysql:3306`.

## Primeira execução ou atualização

```bash
docker compose config --quiet
docker compose up -d --wait mysql
node backend/database/scripts/migrar.mjs
node backend/database/scripts/migrar.mjs --status
docker compose up -d --build web
docker compose ps
docker compose logs --tail=50 web
```

Confirme `mysql` saudável e o Next.js pronto em [http://localhost:3000](http://localhost:3000).

O migrador aplica exclusivamente novas migrações e verifica o hash das já aplicadas. Repita `node backend/database/scripts/migrar.mjs` após `git pull`; ele **não** recria o banco nem apaga dados existentes. Nunca edite uma migração aplicada: acrescente um arquivo sequencial na pasta `backend/database/migrations`.

Caso o volume de dependências fique desatualizado após alteração de `package-lock.json`:

```bash
docker compose run --rm --no-deps web npm ci
docker compose restart web
```

## Conta administrativa de desenvolvimento

```bash
docker compose exec web node scripts/criar-admin.mjs
```

Informe nome, e-mail e senha de pelo menos dez caracteres. Acesse `/admin/login` pelo rodapé. Não existe senha administrativa padrão. O login de cidadão e o login administrativo usam sessões separadas.

## Diagnóstico

```bash
docker compose ps
docker compose logs --tail=100 mysql
docker compose logs --tail=100 web
node backend/database/scripts/migrar.mjs --status
```

Se o MySQL não iniciar, confira o healthcheck e as senhas. Alterar `.env` depois que o volume MySQL já foi criado **não** muda a senha gravada no banco. Não resolva falhas apagando volumes com dados.

## Parar e preservar dados

Use `docker compose down` para parar. Os volumes `mysql_data` e `media_data` persistem. **Nunca use `docker compose down -v` no ambiente da faculdade/casa**. O diretório `backups/` também não deve entrar no GitHub.

## Backup e restauração segura

```bash
node backend/database/scripts/backup-local.mjs
node backend/database/scripts/verificar-restauracao.mjs backups/resgate-<DATA>
```

O primeiro script salva dump e arquivos em `backups/`. O segundo sobe um contêiner temporário **sem portas públicas nem volumes compartilhados**, importa o SQL, confere tabelas e encerra a cópia. Detalhes em [backup e restauração](backup.md).

## CI e segurança

- **CI — Next.js:** dependências, auditoria, lint, testes básicos, tipos, build e imagem Docker.
- **CI — Banco de dados:** MySQL 8.4 isolado, migrações repetíveis, integridade e proteção do histórico.
- **CI — Integração HTTP:** Next.js + MySQL isolados, usuários e ADM de teste, moderação, mapa, chat e notificações, seguidos de backup e restauração isolada.

Os jobs descartam seus próprios volumes no runner. Isso **não ocorre** no computador de ninguém.

## Fora do escopo local

O `compose.yaml` inicia `next dev` com `NODE_ENV=development`. Não é imagem de produção nem substitui HTTPS, domínio, banco gerenciado, storage persistente, backup externo e revisão de LGPD. A localização aproximada depende de serviços externos e deve ser testada com CEPs reais antes da apresentação.
