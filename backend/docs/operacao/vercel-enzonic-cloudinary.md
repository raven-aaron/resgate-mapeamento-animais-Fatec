# Publicação gratuita: Vercel + Enzonic + Cloudinary

Este é o roteiro de hospedagem do Projeto Integrador. **Não publique sem verificar o banco, fotos e autenticação.** A aplicação Next.js disponibiliza as páginas e a API REST sob o mesmo domínio.

## 1. Enzonic — MySQL 8.4

1. Entre em [Enzonic Databases](https://databases.enzonic.com/) e crie uma instância **MySQL 8.4** no plano **Free**.
2. Guarde em local privado a string de conexão **MySQL** fornecida pelo painel. Ela contém senha e não deve ser enviada por chat, commit ou print.
3. No notebook Linux, depois de atualizar esta branch e instalar dependências (`cd frontend && npm ci`), crie `frontend/.env.remoto`:

   ```dotenv
   DATABASE_URL="mysql://USUARIO:SENHA@HOST:3306/BANCO"
   ```

   Substitua a linha inteira pela URI real copiada do painel, sem publicar o arquivo. O `.gitignore` já exclui `.env.*`.
4. Confirme o status e **aplique as migrações uma única vez** no banco remoto:

   ```bash
   cd frontend
   node --env-file=.env.remoto scripts/migrar-remoto.mjs --status
   node --env-file=.env.remoto scripts/migrar-remoto.mjs
   node --env-file=.env.remoto scripts/migrar-remoto.mjs --status
   ```

O migrador remoto verifica MySQL 8.4, usa TLS com certificado validado, calcula hashes SHA-256, registra o histórico e aplica as migrações 001–005 em ordem, inclusive os triggers. Não executa seeds. Se ocorrer falha, **não apague tabelas nem repita migrações cegamente**: o MySQL pode persistir DDL parcialmente e o migrador interromperá operações posteriores. Verifique permissões de `CREATE TRIGGER` no painel Enzonic. 

O Free da Enzonic pode suspender o banco após inatividade. A conexão no servidor tem timeout maior para permitir a retomada, mas o primeiro acesso após suspensão ainda pode demorar. Não coloque credenciais de banco em `NEXT_PUBLIC_*`.

## 2. Cloudinary — fotos privadas

1. No [Cloudinary Console](https://console.cloudinary.com/) escolha o ambiente do projeto.
2. Localize `Cloud name`, `API key` e `API secret`. **Nunca compartilhe o secret**.
3. Na Vercel, configure em **Production**, do lado servidor: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
4. O código armazena cada fotografia como **authenticated**, impedindo o acesso público direto na Cloudinary. A rota local `/api/fotos/[arquivo]` confere publicação, autor da ocorrência ou administrador antes de solicitar a fotografia à Cloudinary. Não utilize upload presets unsigned.

O Docker local continua armazenando fotos em um volume persistente quando as três variáveis Cloudinary não existem. Na Vercel, sem armazenamento externo configurado, a API **recusa o upload** em vez de gravar no disco temporário.

Fotos são enviadas individualmente pelos formulários, com limite de 4 MB cada, para respeitar o limite tradicional de 4,5 MB por requisição das funções Vercel. O cadastro é criado primeiro; se uma foto falhar, o usuário poderá completar o envio em **Minhas ocorrências**.

## 3. Vercel — Next.js e API

O projeto `resgate-mapeamento-animais-fatec` foi criado no painel Vercel, ainda sem Git e sem publicação automática, para não publicar um sistema incompleto.

Configurações:

- **Framework:** Next.js.
- **Root Directory:** `frontend`.
- **Node.js:** 24.x (alinhado ao `.nvmrc`).
- **Production branch:** `main`.
- **Ambiente de produção:** `DATABASE_URL` com a URI privada Enzonic; e as três variáveis `CLOUDINARY_*` citadas acima.
- **Deployment Protection:** permitir acesso público ao domínio de produção; proteger apenas previews.
- Usar o plano **Hobby**, observando os limites de uso e a finalidade acadêmica não comercial.

Somente após aplicar migrações e inserir as variáveis de produção, conectar o GitHub à Vercel e realizar o deploy. Não publicar senhas no GitHub, nos logs ou em URLs do front-end.

## 4. Primeiro administrador

Depois das migrações, no Linux, ainda dentro de `frontend/`, use a mesma `.env.remoto` (o script usa conexão TLS):

```bash
node --env-file=.env.remoto scripts/criar-admin.mjs
```

Informe o nome, e-mail e uma senha forte pelo terminal. A senha é digitada sem eco. O script insere ou atualiza a conta com permissão `ADMIN` no módulo `RESGATE`.

A entrada de administrador é **`/admin/login`**, por URL direta, sem link nos menus públicos. O acesso é protegido por sessão e autorização no servidor, não pelo fato de o endereço ser pouco visível.

Não rode esse script no build da Vercel; não existe senha padrão.

## 5. Checklist de publicação

- [ ] Banco Enzonic acessível por TLS e migrações `001`–`005` aplicadas.
- [ ] Vercel com GitHub conectado à `main`, ambiente de produção configurado e deploy concluído.
- [ ] Cloudinary: upload, visualização e exclusão de fotos autenticadas.
- [ ] Duas contas comuns e um administrador: login, moderação e permissões.
- [ ] Testar o fluxo de animal perdido, encontrado, fotos, mapa, cartazes, conversas e notificações.
- [ ] Reabrir o site em outra máquina para verificar persistência e cookies.
- [ ] Confirmar que o professor consegue abrir a página e a API sem login Vercel.
- [ ] Inserir no README o **GitHub público**, a **URL do front-end** e a **URL pública da API** confirmadas.

Exemplos de caminhos de API após publicação: `https://<dominio>/api/ocorrencias`, `https://<dominio>/api-docs`. Os endereços reais só são informados após teste.

## Limitações

Os serviços gratuitos estão sujeitos a limites, suspensão por inatividade e mudanças de plano. O projeto utiliza MySQL 8.4 remoto (não SQL Server) e não está preparado para volume de tráfego alto. A recuperação de senha por e-mail requer configuração opcional de provedor; sem ela, esse recurso não é garantido na hospedagem.
