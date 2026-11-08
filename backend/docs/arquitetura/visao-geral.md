# Arquitetura do módulo de resgate

## Fluxo de uma requisição

```text
Navegador
   |
   v
frontend/src/app/          páginas do Next.js
   |
   +--> frontend/src/components/ componentes e formulários
   |
   +--> frontend/src/app/api/  endpoints HTTP
                  |
                  v
            frontend/src/lib/  autenticação, consultas e validações
                  |
                  v
            MySQL 8.4         esquema versionado em backend/database/migrations/
```

As fotografias enviadas são gravadas no volume Docker `media_data`. A tabela `fotos_ocorrencias` registra a associação; a rota `/api/fotos/[arquivo]` controla o acesso. O volume local **não é armazenamento de produção**.

## Acesso e permissões

| Perfil | Acesso |
| --- | --- |
| Visitante | Consulta somente ocorrências aprovadas e abertas |
| Cidadão autenticado | Cria e gerencia os próprios registros e participa do chat |
| Administrador do Resgate | Modera ocorrências e consulta as ferramentas administrativas |

A sessão do cidadão e a sessão administrativa usam cookies distintos. O atalho **Painel administrativo** só aparece no menu para uma sessão administrativa válida; páginas e APIs conferem a permissão novamente no servidor, independentemente da visibilidade do link.

## Áreas do código

- `frontend/src/app/api/auth/`: login, cadastro, saída e recuperação.
- `frontend/src/app/api/ocorrencias/`: cadastro, consulta, edição e fotografias.
- `frontend/src/app/api/admin/`: moderação, usuários e mapa administrativo.
- `frontend/src/app/api/conversas/`: conversas e mensagens.
- `frontend/src/app/api/localizacao/`: consulta de CEP e geocodificação.
- `frontend/src/components/`: telas e widgets; não deve acessar MySQL.
- `frontend/src/lib/`: módulos auxiliares, inclusive os usados apenas no servidor.
- `backend/database/migrations/`: evolução sequencial do esquema SQL. Migrações já aplicadas não devem ser editadas.

## Localização e publicação

O CEP é usado para validar uma região; não são divulgados endereços residenciais. O registro só entra no mapa depois da aprovação administrativa. Alterações nessas regras exigem testes de permissão e revisão de back-end.

## Ambientes

- Desenvolvimento principal: `localhost:3000`, MySQL externo ao contêiner na porta `3307`.
- DEMO: `localhost:3001`, MySQL na porta `3308`, volumes e credenciais separados.

O conteúdo do seed DEMO é fictício e não deve ser exibido como ocorrência real. Consulte [operação do DEMO](../operacao/dados-demonstracao.md).

Para os detalhes de tabelas e relacionamentos, leia [modelo de dados](modelo-dados.md) e [dicionário](dicionario-dados.md).
