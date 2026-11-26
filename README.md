# Resgate e Mapeamento de Animais

Projeto Integrador do 3º semestre de Desenvolvimento de Software Multiplataforma da FATEC Votorantim.

O site permite registrar animais perdidos ou encontrados e consultar as ocorrências em um mapa ou em cartazes. Quem encontra um anúncio pode conversar com o responsável pelo registro. Os cadastros passam por análise antes de aparecer na consulta pública.

## O que o sistema faz

- Cadastro e login de cidadãos;
- Cadastro de animais perdidos e encontrados, com fotos e localização aproximada por CEP;
- Busca por animais no mapa e em cartazes, com filtros;
- Edição e encerramento dos próprios registros;
- Conversas entre usuários e notificações;
- Área administrativa para analisar ocorrências, gerenciar permissões e consultar indicadores.

A localização divulgada é aproximada, por bairro. Endereços residenciais não são exibidos no mapa.

## Tecnologias utilizadas

- **Front-end:** Next.js 16, React 19, TypeScript e Bootstrap;
- **API:** rotas HTTP do Next.js (Route Handlers);
- **Banco de dados:** MySQL 8.4, com acesso pelo pacote `mysql2`;
- **Ambiente local:** Docker Compose;
- **Documentação da API:** OpenAPI 3.0.3 e Swagger UI;
- **Testes:** Jest, testes de integração em Node.js e verificações no GitHub Actions.

O front-end e a API fazem parte da mesma aplicação Next.js. As rotas HTTP ficam em `frontend/src/app/api/`, as consultas e transações em `frontend/src/models/`, os serviços de autenticação e validação em `frontend/src/lib/`, e as migrações SQL em `backend/database/migrations/`. Não há um servidor Express separado.

## Como executar no computador

### Pré-requisitos

- Git;
- Docker Desktop com Docker Compose v2 aberto e em execução;
- Node.js 24 instalado no computador.

Em um terminal, baixe o projeto:

```bash
git clone https://github.com/raven-aaron/resgate-mapeamento-animais-Fatec.git
cd resgate-mapeamento-animais-Fatec
```

Copie o arquivo `.env.example` para `.env` na raiz do repositório. No PowerShell:

```powershell
Copy-Item .env.example .env
notepad .env
```

Preencha `MYSQL_ROOT_PASSWORD` e `MYSQL_PASSWORD` com senhas **fortes e diferentes**. Não altere `MYSQL_USER` ou `MYSQL_DATABASE` sem necessidade. O arquivo `.env` é local e não deve ser enviado ao GitHub.

Ainda na raiz do projeto, inicialize o banco:

```bash
docker compose up -d --wait mysql
```

Em seguida, aplique as migrações e inicie a aplicação:

```bash
node backend/database/scripts/migrar.mjs
docker compose up -d --build web
```

Quando o serviço estiver iniciado, abra:

- **Site (front-end):** http://localhost:3000
- **API (exemplo de consulta):** http://localhost:3000/api/ocorrencias
- **Documentação Swagger:** http://localhost:3000/api-docs
- **Especificação OpenAPI:** http://localhost:3000/openapi.json

As páginas e as rotas de API usam o mesmo endereço-base. O banco MySQL fica disponível somente no computador, por padrão na porta `3307`.

Para acompanhar os logs:

```bash
docker compose logs -f web
```

Para encerrar sem apagar o banco:

```bash
docker compose down
```

**Atenção:** `docker compose down -v` remove os volumes e apaga os dados locais. Não use esse comando para desligar o projeto normalmente.

### Administração e dados de teste

O cadastro comum não cria um usuário administrador. Para cadastrar um administrador no ambiente local, execute:

```bash
docker compose exec web node scripts/criar-admin.mjs
```

O script exige os dados definidos durante sua execução. A área administrativa é acessada diretamente por `/admin/login`, separado do login do cidadão e sem link na navegação pública. Na hospedagem Vercel, o primeiro administrador é criado pelo script no notebook, com conexão TLS ao MySQL remoto. Consulte [Acesso administrativo](backend/docs/operacao/acesso-administrativo.md).

Existe também um ambiente de demonstração com banco separado, contas de teste e ocorrências fictícias. As instruções estão em [Dados de demonstração](backend/docs/operacao/dados-demonstracao.md). Não utilize esses registros como se fossem ocorrências reais.

### Testes e verificações

Com o banco e o ambiente preparados, no diretório `frontend/`:

```bash
cd frontend
npm ci
npm run check:versions
npm run test:jest
npm run test:regras
npm run test:openapi
npm run test:origem
npm run test:fotos
npm run lint
npx next typegen
npx tsc --noEmit
npm run build
```

Os testes que dependem de banco de dados devem ser executados em ambiente de teste ou DEMO, não em banco com registros reais. A CI também contém verificações de banco e integração.

## API e documentação

A API utiliza JSON nas rotas comuns e `multipart/form-data` quando há envio de fotos. As operações principais são:

- `GET /api/ocorrencias`: listar ocorrências públicas;
- `POST /api/ocorrencias`: cadastrar ocorrência;
- `GET /api/ocorrencias/{id}`: consultar ocorrência pública;
- `PUT /api/ocorrencias/{id}`: editar dados da própria ocorrência;
- `PATCH /api/ocorrencias/{id}`: editar ou encerrar, conforme a ação enviada;
- `DELETE /api/ocorrencias/{id}`: excluir logicamente o próprio registro.

Operações protegidas exigem autenticação. A aplicação mantém sessões no servidor, com cookies `HttpOnly`, e verifica permissões antes de acessar os dados.

A lista completa de rotas, parâmetros e respostas pode ser consultada no [Swagger UI](frontend/public/swagger/index.html), no [arquivo OpenAPI](frontend/public/openapi.json) ou na [documentação técnica da API](backend/docs/arquitetura/api-http.md).

## Hospedagem

O front-end e a API REST são publicados juntos no mesmo projeto Next.js na Vercel, com MySQL 8.4 hospedado na Enzonic e fotografias na Cloudinary.

- **Front-end (site público):** https://resgate-mapeamento-animais-fatec.vercel.app/
- **Back-end (API REST pública, exemplo GET):** https://resgate-mapeamento-animais-fatec.vercel.app/api/ocorrencias
- **Documentação da API (Swagger):** https://resgate-mapeamento-animais-fatec.vercel.app/api-docs
- **Especificação OpenAPI:** https://resgate-mapeamento-animais-fatec.vercel.app/openapi.json

**Para a entrega do Projeto Integrador:** o repositório público é https://github.com/raven-aaron/resgate-mapeamento-animais-Fatec . Os links do front-end e back-end acima são URLs externas, acessíveis sem `localhost`, e usam o mesmo domínio porque a API faz parte da aplicação Next.js. As funções protegidas exigem sessão e autorização específicas.

O deploy de produção foi concluído com sucesso na Vercel (status `READY`), mas o ciclo completo de testes manuais — incluindo upload de fotografias pela Cloudinary, aprovação administrativa, mapa e chat — deve ser conferido em produção antes da apresentação. O domínio pode permanecer no ar enquanto correções são publicadas.

Para operar a hospedagem, siga [Vercel, Enzonic e Cloudinary](backend/docs/operacao/vercel-enzonic-cloudinary.md). A configuração [Vercel e Azure](backend/docs/operacao/vercel-azure.md) permanece como alternativa.

## Integrantes

- Bianca Diebe
- Gabriel Tiago Santos Leme
- Maria Eduarda Camargo da Silva
- Maurício Fernandes de Oliveira Almeida
- Raven Aaron Albuquerque Prestes Batista

## Mais informações

- [Organização da aplicação](backend/docs/arquitetura/visao-geral.md)
- [Arquitetura MVC](backend/docs/arquitetura/mvc.md)
- [Banco de dados e migrações](backend/database/README.md)
- [Roteiro de testes no navegador](backend/docs/apresentacao/validacao.md)
- [Como contribuir](CONTRIBUTING.md)
