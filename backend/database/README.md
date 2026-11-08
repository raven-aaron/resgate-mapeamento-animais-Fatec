# Banco de dados

O projeto usa MySQL 8.4.13 (InnoDB) em um serviço Docker definido em `compose.yaml`. As tabelas, índices, chaves estrangeiras e gatilhos são criados pelos arquivos em `backend/database/migrations/`.

**Esquema atual:** 17 tabelas de aplicação mais `controle_migracoes`, criada pelo migrador. A aplicação acessa o banco por `frontend/src/lib/db.ts` usando `mysql2/promise`, sem ORM.

## Migrações

| Arquivo | Conteúdo |
| --- | --- |
| `001_estrutura.sql` | Tabelas, índices, chaves estrangeiras, restrições e triggers |
| `002_catalogos.sql` | Espécies, cores e raças iniciais |
| `003_localizacao_rua.sql` | CEP e localização aproximada nas ocorrências |
| `004_catalogo_racas_caninas.sql` | Catálogo complementar de raças |
| `005_situacao_lar_temporario.sql` | Situação de acolhimento temporário para ocorrências de animais encontrados |

O script `backend/database/scripts/migrar.mjs` confere a versão do MySQL, compara o SHA-256 de cada migração e registra o histórico em `controle_migracoes`. Uma migração aplicada não deve ser editada; mudanças futuras entram em novo arquivo numerado.

## Tabelas por responsabilidade

| Domínio | Tabelas |
| --- | --- |
| Contas | `usuarios`, `permissoes_usuarios`, `sessoes`, `recuperacoes_senha` |
| Catálogos | `bairros`, `especies`, `racas`, `cores` |
| Ocorrências | `animais`, `animais_cores`, `ocorrencias`, `fotos_ocorrencias`, `historico_ocorrencias` |
| Mensagens | `conversas`, `mensagens` |
| Controle e registros | `notificacoes`, `auditoria` |
| Versões do esquema | `controle_migracoes` |

A ocorrência pertence a um usuário e tem uma ficha de animal. As cores são uma relação N:N com `animais_cores`. Uma ocorrência pode ter várias fotos e conversas. A foto é um arquivo no volume `media_data`; no MySQL ficam a URL, o identificador e a ordem.

## Rodar e consultar

Na raiz, com `.env` configurado:

```powershell
docker compose up -d --wait mysql
node backend/database/scripts/migrar.mjs
node backend/database/scripts/migrar.mjs --status
```

Para abrir o cliente SQL no contêiner DEMO:

```powershell
docker compose --env-file .env.demo -p resgate-animais-demo exec mysql sh -c 'MYSQL_PWD="$MYSQL_PASSWORD" mysql -u "$MYSQL_USER" "$MYSQL_DATABASE"'
```

No cliente:

```sql
SHOW TABLES;
SHOW CREATE TABLE ocorrencias\G
SELECT id_ocorrencia, tipo_ocorrencia, status_aprovacao FROM ocorrencias LIMIT 10;
```

O ambiente DEMO usa banco, credenciais e volumes diferentes. O seed cria registros fictícios e uma conta administrativa **somente no DEMO**; o ambiente normal não cria usuários ou administradores automaticamente.

## Integridade

O banco utiliza chaves estrangeiras, índices e restrições `CHECK`. Triggers impedem alterar o criador de uma ocorrência, iniciar conversas inválidas, enviar mensagens por terceiros e editar o conteúdo de mensagens já enviadas. As APIs conferem autenticação, propriedade e regras de publicação.

O cadastro de uma ocorrência grava animal, ocorrência, cores, fotos e histórico em uma transação. A exclusão de ocorrência é lógica, por `excluido_em`, para preservar as relações e o histórico.

Para os campos e relacionamentos, consulte [modelo de dados](../docs/arquitetura/modelo-dados.md) e [dicionário de dados](../docs/arquitetura/dicionario-dados.md). Os contratos HTTP estão em [API](../docs/arquitetura/api-http.md). O backup local está descrito em [operação](../docs/operacao/backup.md).
