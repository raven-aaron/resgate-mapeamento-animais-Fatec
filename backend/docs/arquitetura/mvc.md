# Arquitetura MVC

O projeto utiliza o Next.js com App Router. A divisão de responsabilidades segue o modelo MVC, adaptado à organização do framework, sem manter um servidor Express separado.

| Camada | Onde fica | Responsabilidade |
| --- | --- | --- |
| **Model** | `frontend/src/lib/db.ts`, `frontend/src/lib/ocorrencias.ts` e `backend/database/` | Conexão MySQL, consultas, estrutura das tabelas e regras de persistência |
| **View** | `frontend/src/app/**/page.tsx` e `frontend/src/components/` | Telas, formulários, cartões e mapa exibidos no navegador |
| **Controller** | `frontend/src/app/api/**/route.ts` | Recebe os métodos HTTP, valida a entrada, confere autorização e retorna a resposta |
| **Serviços compartilhados** | `frontend/src/lib/auth.ts`, `seguranca.ts` e `localizacao-cep.ts` | Autenticação, proteção de origem e geocodificação utilizadas pelos controllers |

## Exemplo: consulta de ocorrências

1. A página `/mapa` busca os dados pela API.
2. O controller `GET /api/ocorrencias` lê os filtros e chama `buscarPublicas`.
3. O model em `src/lib/ocorrencias.ts` consulta o MySQL, limitando a busca aos registros aprovados e abertos.
4. O controller devolve JSON; a view renderiza marcadores e acesso aos cartazes.

A API oferece métodos GET, POST, PUT, PATCH e DELETE. Para alterar uma ocorrência, a sessão deve pertencer ao autor; para moderá-la, é exigida a permissão administrativa.

## Observação sobre a organização

Algumas rotas de escrita ainda incluem SQL no próprio controller. Nesses pontos, a separação não é tão rígida quanto em um MVC tradicional com models independentes. O objetivo é preservar as regras que já funcionam enquanto as responsabilidades são organizadas. A divisão acima descreve a estrutura **real** do repositório, sem afirmar que há uma camada MVC clássica inteiramente separada.

Para detalhes das rotas, consulte [API HTTP](api-http.md). Para as tabelas e relacionamentos, consulte [Modelo de dados](modelo-dados.md).
