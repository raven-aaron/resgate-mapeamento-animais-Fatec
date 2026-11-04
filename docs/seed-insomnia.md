# Dados sintéticos e Insomnia — ambiente DEMO

O seed cria **registros reais em um MySQL de demonstração** (não mocks no navegador). As informações são inventadas: nomes, regiões, coordenadas, mensagens e e-mails sob `*.invalid`. As fotos ilustrativas são obtidas de uma seleção de fotografias de cães e gatos disponibilizadas no Pexels (licença Pexels) e armazenadas **somente no volume local do DEMO**. Elas não retratam animais realmente perdidos ou encontrados.

**Segurança:** o projeto principal continua em `http://localhost:3000` e `127.0.0.1:3307`. O DEMO utiliza **outro projeto Docker** (`resgate-animais-demo`), com volumes próprios, `http://localhost:3001`, MySQL em `127.0.0.1:3308` e banco `resgate_animais_demo`. Nunca execute seed na base utilizada pela equipe.

## Iniciar o DEMO (Linux/WSL)

Na raiz do projeto, com Docker e Node.js 24 disponíveis:

```bash
cp .env.demo.example .env.demo
```

Edite `.env.demo` e preencha `MYSQL_ROOT_PASSWORD` e `MYSQL_PASSWORD` com **senhas fortes diferentes** (mínimo 12 caracteres). Não copie o `.env` da aplicação principal e não envie `.env.demo` ao GitHub.

```bash
docker compose --env-file .env.demo -p resgate-animais-demo up -d --wait mysql
RESGATE_DEMO=1 node database/scripts/migrar.mjs
RESGATE_DEMO=1 node database/scripts/migrar.mjs --status

# Prévia: não faz nenhuma escrita no banco
node database/scripts/seed-demo.mjs --dry-run --count 80 --users 24 --chats 35 --seed 2026

# Insere registros reais no MySQL de DEMONSTRAÇÃO
RESGATE_DEMO=1 node database/scripts/seed-demo.mjs --apply --count 80 --users 24 --chats 35 --seed 2026

docker compose --env-file .env.demo -p resgate-animais-demo up -d --build web
docker compose --env-file .env.demo -p resgate-animais-demo ps

# Completar o seed com fotos locais e corrigir as coordenadas
docker compose --env-file .env.demo -p resgate-animais-demo exec -e RESGATE_DEMO=1 web node scripts/enriquecer-demo.mjs --apply
```

Acesse **http://localhost:3001/mapa**. As ocorrências continuam aparecendo **somente no mapa**, nunca na página inicial. O contêiner demo permanece separado dos volumes da aplicação normal.

No PowerShell, a variável de execução é definida assim (os demais comandos são os mesmos):

```powershell
Copy-Item .env.demo.example .env.demo
$env:RESGATE_DEMO = "1"
node database/scripts/migrar.mjs
node database/scripts/seed-demo.mjs --apply --count 80 --users 24 --chats 35 --seed 2026
Remove-Item Env:RESGATE_DEMO
```

### Adicionar fotografias e corrigir pontos no mapa sem apagar dados

O seed inicial e o mapa agora distribuem as ocorrências por **30 setores ilustrativos** em uma área mais ampla. Depois de iniciar o serviço `web`, rode este comando **uma única vez** para associar fotos às ocorrências já existentes e reorganizar os pins:

```bash
docker compose --env-file .env.demo -p resgate-animais-demo exec -e RESGATE_DEMO=1 web node scripts/enriquecer-demo.mjs --apply
```

Use `--dry-run` no lugar de `--apply` para visualizar quantos registros serão atualizados. **Não execute `down -v`, não refaça o seed e não altere as senhas**: o comando preserva contas, senhas, chat, moderação, notificações e dados criados manualmente.

O primeiro uso com fotos precisa de conexão com a Internet para baixar imagens de [Pexels](https://www.pexels.com/pt-br/licenca/); elas ficam em `storage/demo-seed-cache` e `storage/uploads` do contêiner DEMO, nunca no Git. Se a rede falhar, o script interrompe a operação sem alterar o banco; tente novamente. Após completar, fotos já existentes não são substituídas e reexecutar é seguro (adiciona apenas as que ainda faltarem).

As fotos são **ilustrativas**, não das pessoas ou animais de Votorantim; a associação por espécie é apenas para ensaio de interface. As coordenadas são igualmente fictícias, sem endereços residenciais ou dados reais. Para localizar um animal verdadeiro, use somente dados informados e validados pelas APIs normais.

### O que é gerado

Por padrão: 24 contas (uma administradora), 80 animais/ocorrências distribuídos por 30 setores, 35 conversas, mensagens não lidas, notificações, cores, bairros **fictícios** e histórico de moderação. Há registros aprovados e abertos, pendentes, rejeitados, ocultos e resolvidos. Datas e características variam com o `--seed` informado; a senha é aleatória, não versionada.

A execução informa o resumo e as credenciais de demonstração **somente no terminal**. Guarde a senha gerada de forma privada. Os dois exemplos de e-mail são:

- Cidadão: `demo.usuario01@seed.resgate.invalid`
- Administrador: `demo.admin@seed.resgate.invalid` (entrar exclusivamente em `http://localhost:3001/admin/login`)

As contas têm a mesma senha aleatória do lote, porém cada hash usa salt próprio. Nunca reaproveite uma senha real. O seed **recusa repetir a inserção** num banco que já tenha usuários/ocorrências; não oferece opção de apagar registros. Para um novo lote, use outro banco de demonstração limpo, após preservar os dados necessários.

As regiões (`Região Demo 01`, etc., até `Região Demo 30`) são fictícias e apenas ilustram o mapa. Não representam bairros confirmados de Votorantim; CEP não é inventado. Para testar cadastro manual via API ou página, informe um CEP **verdadeiro** de Votorantim, validável pelos serviços externos.

### Parar o DEMO, preservando volumes

```bash
docker compose --env-file .env.demo -p resgate-animais-demo down
```

Não use `down -v` em ambientes com informações que deseja preservar. Não execute `docker compose down -v` no projeto principal.

## Importar no Insomnia

Arquivo: [`insomnia/resgate-demo.insomnia-v4.json`](../insomnia/resgate-demo.insomnia-v4.json).

1. No Insomnia, escolha **Import → File** e selecione o arquivo. O formato é **Insomnia JSON v4**, atualmente suportado para importação.
2. Abra os ambientes da coleção e defina `cidadao_senha` e `admin_senha` **localmente**, usando a senha gerada no terminal. Não envie senhas para o GitHub nem exporte o ambiente com esses valores.
3. A variável `base_url` começa em `http://localhost:3001`. Use o banco DEMO, nunca a porta 3000 por engano.
4. Primeiro execute **Entrar como cidadão**, depois **Minha sessão**, **Listar animais** e **Minhas conversas**. Para testar moderação, faça login administrativo, consulte **Fila de moderação** e escolha um `ocorrencia_id` pendente.
5. IDs de ocorrência, conversa e mensagem são **variáveis manuais** (você os obtém nas respostas). Os requests não adivinham IDs nem alteram contas automaticamente.
6. Para **cadastrar** nova ocorrência, preencha `cep` e `data_evento` (YYYY-MM-DD, não futura). Os dois requests de cadastro são multipart e incluem `confirmacao_privacidade`. Não incluem fotos inicialmente.
7. Requests `PATCH`, `DELETE` e alguns `POST` **alteram o banco**. Execute manualmente o pedido desejado, não clique em executar a coleção inteira sem revisar os IDs.

A autenticação usa cookies HttpOnly do servidor: `resgate_sessao` para cidadãos e `resgate_admin_sessao` para administrador. O Insomnia deve armazenar e reenviar cookies por padrão; se uma requisição retornar 401/403, confira a cookie jar e a sessão do papel correto.

## Testes automatizados

A pipeline **CI — Seed DEMO e Insomnia** usa Docker isolado para aplicar migrações, criar os registros, verificar que repetir o seed é recusado e consultar `/api/ocorrencias` pelo Next.js. O workflow remove **somente** seus volumes efêmeros no runner GitHub.

Para validação local sem Docker e sem escrita:

```bash
node --test database/tests/seed-demo.test.mjs
```

## Limites

- O enriquecimento baixa fotografias licenciadas de animais apenas para ilustração. Cada ocorrência sintética recebe uma imagem local. Para validar upload/edição de fotos, continue usando as APIs e o formulário de cidadão.
- A autenticação e as APIs ainda dependem das regras reais de acesso; dados criados diretamente por script não substituem os testes HTTP já existentes.
- Não usar esses nomes e e-mails de teste em produção, nem publicá-los como registros verdadeiros.
