# Arquitetura do módulo de resgate

## Fluxo de uma requisição

```text
Navegador
   |
   v
web/src/app/              páginas do Next.js
   |
   +--> web/src/components/    componentes e formulários
   |
   +--> web/src/app/api/       endpoints HTTP
                  |
                  v
            web/src/lib/       autenticação, consultas e validações
                  |
                  v
            MySQL 8.4         esquema versionado em database/migrations/
```

As fotografias enviadas são gravadas no volume Docker `media_data`. A tabela `fotos_ocorrencias` registra a associação; a rota `/api/fotos/[arquivo]` controla o acesso. O volume local **não é armazenamento de produção**.

## Acesso e permissões

| Perfil | Acesso |
| --- | --- |
| Visitante | Consulta somente ocorrências aprovadas e abertas |
| Cidadão autenticado | Cria e gerencia os próprios registros e participa do chat |
| Administrador do Resgate | Modera ocorrências e consulta as ferramentas administrativas |

A sessão do cidadão e a sessão administrativa usam cookies distintos. O front-end apenas apresenta os estados de autenticação; a autorização é conferida nas rotas do servidor.

## Áreas do código

- `web/src/app/api/auth/`: login, cadastro, saída e recuperação.
- `web/src/app/api/ocorrencias/`: cadastro, consulta, edição e fotografias.
- `web/src/app/api/admin/`: moderação, usuários e mapa administrativo.
- `web/src/app/api/conversas/`: conversas e mensagens.
- `web/src/app/api/localizacao/`: consulta de CEP e geocodificação.
- `web/src/components/`: telas e widgets; não deve acessar MySQL.
- `web/src/lib/`: módulos auxiliares, inclusive os usados apenas no servidor.
- `database/migrations/`: evolução sequencial do esquema SQL. Migrações já aplicadas não devem ser editadas.

## Localização e publicação

O CEP é usado para validar uma região; não são divulgados endereços residenciais. O registro só entra no mapa depois da aprovação administrativa. Alterações nessas regras exigem testes de permissão e revisão de back-end.

## Ambientes

- Desenvolvimento principal: `localhost:3000`, MySQL externo ao contêiner na porta `3307`.
- DEMO: `localhost:3001`, MySQL na porta `3308`, volumes e credenciais separados.

O conteúdo do seed DEMO é fictício e não deve ser exibido como ocorrência real. Consulte [operação do DEMO](../operacao/dados-demonstracao.md).

Para os detalhes de tabelas e relacionamentos, leia [modelo de dados](modelo-dados.md) e [dicionário](dicionario-dados.md).
