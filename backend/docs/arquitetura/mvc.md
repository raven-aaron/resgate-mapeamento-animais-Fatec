# Organização MVC

O sistema usa **Next.js (App Router)**. Mantivemos a estrutura do framework e separamos as responsabilidades do MVC sem criar um servidor Express.

| Parte | Onde fica | Para que serve |
| --- | --- | --- |
| **Model (Modelo)** | `frontend/src/models/`, `frontend/src/lib/ocorrencias.ts` e `backend/database/` | Consultas SQL, alterações no MySQL, transações e estrutura do banco |
| **View (Visão)** | `frontend/src/app/**/page.tsx` e `frontend/src/components/` | Formulários, cartazes, mapas e telas administrativas |
| **Controller (Controlador)** | `frontend/src/app/api/**/route.ts` | Recebe GET, POST, PUT, PATCH e DELETE, valida requisições, confere sessão e devolve respostas HTTP |

As funções auxiliares em `frontend/src/lib/` oferecem autenticação, validação de origem, localização e acesso básico ao banco. As sessões são administradas em `lib/auth.ts`; suas consultas SQL ficam em `models/sessoes.ts`.

## Exemplo: cadastrar um animal

1. **View:** `FormularioOcorrencia.tsx` recebe o nome do animal, CEP e fotos.
2. **Controller:** `POST /api/ocorrencias` verifica a sessão, os campos e o formato das imagens.
3. **Model:** `models/ocorrencias.ts` cria o animal e a ocorrência no MySQL, com histórico e fotos na mesma transação.
4. **Controller:** devolve HTTP 201 e o identificador da ocorrência; a interface mostra a confirmação.

Para atualizar uma ocorrência, o controller chama `models/edicao-ocorrencias.ts`. A edição continua exigindo que a conta seja dona do cadastro e volta para a moderação. O mesmo padrão é usado nos modelos de usuários, administração, mensagens, notificações, fotos e recuperação de senha.

## Por que não existem pastas controllers e views separadas?

No Next.js, os controllers HTTP já são os arquivos `route.ts`, e as views são as páginas `page.tsx` e os componentes React. Criar outra estrutura de rotas apenas para reproduzir os nomes MVC duplicaria o framework.

O MVC é usado como **separação de responsabilidades dentro do Next.js**, e não como um framework MVC tradicional. O acesso ao banco foi extraído das rotas e das páginas principais; isso não muda os endereços da API.

Veja [rotas da API](api-http.md), [documentação Swagger](swagger.md) e [roteiro de testes](../apresentacao/validacao.md).
