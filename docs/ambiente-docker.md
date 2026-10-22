# Ambiente local com Docker Compose

Este ambiente serve **somente para desenvolvimento**. Ele inicializa a aplicação Next.js e um banco MySQL 8.4.13 isolado, sem exigir instalação local do MySQL.

## Pré-requisito

Instale e inicie o Docker Desktop, com mecanismo Linux/WSL2 no Windows. Confira no terminal da pasta raiz:

```powershell
docker --version
docker compose version
```

## Primeiro uso (Windows PowerShell)

Na raiz do repositório, após sincronizar o código com a branch correta:

```powershell
Copy-Item .env.example .env
```

Abra o arquivo **.env** da raiz e preencha `MYSQL_ROOT_PASSWORD` e `MYSQL_PASSWORD` com **duas senhas fortes diferentes**. Nunca compartilhe esse arquivo ou faça commit dele; `.gitignore` já o ignora.

Inicie tudo:

```powershell
docker compose up --build
```

Na primeira execução o Docker baixa a imagem MySQL, compila a imagem Node.js, instala dependências e cria o banco vazio. A aplicação aguarda o MySQL responder ao healthcheck.

Acesso:
- Aplicação Next.js: http://localhost:3000
- MySQL no computador: host `127.0.0.1`, porta `3307`, usuário e senha definidos em `.env`, banco `resgate_animais`
- No **código Next.js dentro do contêiner**, o hostname é **`mysql`** e a porta interna é **`3306`**. O Compose injeta `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`; a integração de persistência ainda será implementada.

Se a porta 3000 ou 3307 estiver ocupada, pare o serviço anterior ou altere `WEB_PORT` / `MYSQL_HOST_PORT` no `.env`. O Next.js iniciado diretamente com `npm run dev` deve ser parado antes de usar Docker na mesma porta.

## Desenvolvimento diário

Com o terminal na raiz do repositório:

```powershell
docker compose up
```

Mudanças nos arquivos da pasta `web/` são montadas no contêiner; o Next.js deve atualizar a interface em desenvolvimento. Se o sistema de arquivos do Windows não sinalizar alterações corretamente, reinicie o serviço e verifique as configurações de compartilhamento/WSL2 do Docker Desktop.

Em outro terminal, para ver o estado:

```powershell
docker compose ps
```

Para parar e preservar os dados:

```powershell
docker compose down
```

O volume `mysql_data` mantém os dados do MySQL entre reinicializações. **Não use `docker compose down -v` sem necessidade**: ele apaga os volumes persistentes deste ambiente, inclusive o banco.

Se mudar `package.json` / `package-lock.json`, reinstale as dependências do contêiner após sincronizar os arquivos:

```powershell
docker compose exec web npm ci
```

Para reconstruir a imagem quando necessário:

```powershell
docker compose up --build
```

## Diagnóstico

```powershell
docker compose ps
docker compose logs --tail=100 mysql
docker compose logs --tail=100 web
```

Uma falha de conexão inicial pode ser apenas a criação do banco durante a primeira execução. Se a senha ou o nome do banco forem alterados após a inicialização, a imagem MySQL **não altera automaticamente** as credenciais existentes no volume; ajuste-as com SQL administrativo ou recrie o volume **somente se os dados puderem ser descartados**.

## Testes e segurança

- Este Compose é para **desenvolvimento local**, não deploy de produção.
- As portas são publicadas apenas em `127.0.0.1`, não na rede local.
- Nenhuma senha real deve ser versionada; o `.env.example` é apenas um modelo vazio.
- O pipeline do GitHub Actions valida a sintaxe do Compose e a construção da imagem web; não executa ainda testes de CRUD nem migrações SQL.
- As configurações do MySQL e do Node serão evoluídas por Pull Requests separados.
