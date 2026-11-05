# Instalação no Windows — equipe

Este guia instala uma cópia **local e independente** do projeto, com banco MySQL e dados de demonstração. Faça os comandos no **PowerShell do VS Code**, salvo quando indicado.

## 1. Instalar as ferramentas (uma vez por computador)

- [Git para Windows](https://git-scm.com/downloads/win)
- [Node.js 24](https://nodejs.org/en/download)
- [Visual Studio Code](https://code.visualstudio.com/download)
- [Docker Desktop para Windows](https://www.docker.com/products/docker-desktop/)

O Docker Desktop usa **WSL 2**. Se o instalador pedir WSL, abra o PowerShell **como administrador**, execute `wsl --install` e **reinicie o Windows**. Depois abra o Docker Desktop e aguarde o mecanismo iniciar.

Feche e reabra o VS Code depois de instalar as ferramentas. No terminal, confira:

```powershell
git --version
node --version
docker --version
docker compose version
docker info
```

O Node deve ser da versão **24**. O `docker info` precisa mostrar a seção **Server** sem erro de conexão. Se disser que não consegue se conectar ao Docker Engine, abra o Docker Desktop e espere iniciar.

## 2. Acessar e clonar o repositório

O repositório é **privado**. Peça ao responsável para adicionar sua conta como colaborador no GitHub e **aceite o convite** antes de clonar.

No PowerShell:

```powershell
cd $HOME
git clone https://github.com/raven-aaron/resgate-mapeamento-animais-Fatec.git
cd resgate-mapeamento-animais-Fatec
code .
```

Se pedir autenticação, entre na sua conta do GitHub com acesso ao repositório. **Os comandos seguintes devem ser executados na raiz do projeto**, onde estão `compose.yaml` e `.env.demo.example`; não entre na pasta `database/migrations`.

## 3. Configurar o ambiente DEMO

```powershell
Copy-Item .env.demo.example .env.demo
notepad .env.demo
```

Preencha **somente os valores** de `MYSQL_ROOT_PASSWORD` e `MYSQL_PASSWORD` com senhas **diferentes**, cada uma com **12 ou mais caracteres**. Mantenha os demais valores padrão:

```dotenv
MYSQL_DATABASE=resgate_animais_demo
MYSQL_USER=resgate_demo
MYSQL_HOST_PORT=3308
WEB_PORT=3001
WEB_BIND_HOST=127.0.0.1
APP_PUBLIC_URL=http://localhost:3001
```

Salve o arquivo. **Nunca envie o `.env.demo` para o GitHub nem compartilhe as senhas.**

## 4. Iniciar o MySQL

Com o Docker Desktop aberto:

```powershell
docker compose --env-file .env.demo -p resgate-animais-demo up -d --wait mysql
```

Espere aparecer `Healthy`. Na primeira execução o Docker baixa a imagem do MySQL; isso pode demorar.

## 5. Criar as tabelas e os dados de teste

```powershell
$env:RESGATE_DEMO = "1"
node database/scripts/migrar.mjs
node database/scripts/migrar.mjs --status
node database/scripts/seed-demo.mjs --apply
Remove-Item Env:RESGATE_DEMO
```

O seed cria contas, ocorrências, conversas e uma conta administrativa fictícias. **Anote a senha exibida no terminal**; ela não é salva na documentação. Não repita o seed depois que o banco estiver preenchido.

## 6. Iniciar o site

```powershell
docker compose --env-file .env.demo -p resgate-animais-demo up -d --build web
```

Para completar as imagens e os pontos do mapa (requer Internet):

```powershell
docker compose --env-file .env.demo -p resgate-animais-demo exec -e RESGATE_DEMO=1 web node scripts/enriquecer-demo.mjs --apply
```

Abra no navegador:

- **Site:** http://localhost:3001
- **Mapa:** http://localhost:3001/mapa
- **Administrador:** http://localhost:3001/admin/login

Contas DEMO:
- **Administrador:** `demo.admin@seed.resgate.invalid`
- **Cidadão:** `demo.usuario01@seed.resgate.invalid`
- **Senha:** a que apareceu ao executar o seed (a mesma para as contas do lote).

Para testar um usuário novo, faça cadastro pela interface do site. Para testar os dois perfis ao mesmo tempo, use uma janela normal e outra anônima.

## 7. Próximas vezes

Para ligar o projeto novamente, abra o Docker Desktop e execute na raiz:

```powershell
docker compose --env-file .env.demo -p resgate-animais-demo up -d
```

Para verificar os serviços:

```powershell
docker compose --env-file .env.demo -p resgate-animais-demo ps
```

Para desligar **sem apagar o banco**:

```powershell
docker compose --env-file .env.demo -p resgate-animais-demo down
```

**Não use `down -v`**: isso remove os volumes e apaga os dados locais.

Para atualizar o código depois de alterações aprovadas na `main`:

```powershell
git switch main
git pull --ff-only
docker compose --env-file .env.demo -p resgate-animais-demo up -d --build web
```

Se houver novas migrações, execute os comandos do passo 5 **somente para migrar** (não repita o seed).

## Problemas comuns

| Erro | O que fazer |
| --- | --- |
| `git`, `node` ou `docker` não reconhecido | Instale a ferramenta correspondente; feche e reabra o VS Code |
| `failed to connect to the docker API` | Abra o Docker Desktop e espere o Engine iniciar |
| `Copy-Item ... não existe` | Volte à raiz do repositório (`cd ..\..` se estiver em `database/migrations`) |
| Erro de autenticação ao clonar | Confirme o convite de colaborador e o login no GitHub |
| Porta 3001 ou 3308 ocupada | Confira os programas em execução; se necessário, altere a porta correspondente no `.env.demo` |
| Senha DEMO esquecida | Não refaça o seed nem apague o banco; peça ajuda para redefinir o acesso |

## Onde ficam as coisas?

- **Código do site:** `web/`
- **Tabelas e alterações SQL:** `database/migrations/`
- **MySQL:** contêiner Docker, com dados guardados em volume persistente
- **Guia do banco:** [database/README.md](../../database/README.md)
- **Guia para trabalhar no front-end:** [docs/frontend/guia-equipe.md](../frontend/guia-equipe.md)
- **Detalhes do ambiente DEMO:** [docs/operacao/dados-demonstracao.md](dados-demonstracao.md)

Não é preciso instalar MySQL no Windows nem executar `npm install` para **apenas rodar** a aplicação pelo Docker: o contêiner da web instala as dependências necessárias. Para executar comandos de desenvolvimento e testes **fora do Docker**, use `cd web` e `npm ci`.
