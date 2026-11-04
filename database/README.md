# Banco de dados — Resgate e Mapeamento

Esta proposta evolui o SQL de sete tabelas do grupo. Usa **MySQL 8.4**, o banco
**resgate_animais** já configurado no Docker e nomes em português, minúsculos,
sem acentos, separados por sublinhado. São **17 tabelas de aplicação + 1 de
controle de migrações**. O módulo de ração tem pontos de integração definidos;
suas tabelas de negócio ainda dependem dos requisitos do outro grupo.

## O que ler

- [Modelo, decisões e relacionamentos](../docs/modelo-banco.md).
- [Campos de cada tabela](../docs/dicionario-banco.md).
- [Contrato entre frontend, backend e os dois grupos](../docs/integracao-modulos.md).
- `migrations/001_estrutura.sql`: tabelas, índices, restrições e regras de chat.
- `migrations/002_catalogos.sql`: espécies, cores e raças básicas.

## Aplicar no Docker local

Pré-requisitos: Git, Docker Desktop em execução e Node.js 24, conforme o ambiente
já padronizado. Não é preciso instalar MySQL ou bibliotecas npm no computador
para executar o migrador.

Na raiz do repositório, com o `.env` local já preenchido:

```powershell
docker compose up -d mysql
node database/scripts/migrar.mjs
node database/scripts/migrar.mjs --status
docker compose up -d web
```

Antes de migrar, confira `docker compose ps`: MySQL deve estar `healthy`.
O migrador lê o estado com `MYSQL_USER`/`MYSQL_PASSWORD` e aplica mudanças com
`root`/`MYSQL_ROOT_PASSWORD`, apenas dentro do Docker local, na base `MYSQL_DATABASE`.
Isso permite instalar triggers com binlog ativo sem conceder privilégios globais
ao usuário da aplicação. As consultas de teste usam o usuário da aplicação.
O comando não imprime senhas e evita as aspas problemáticas do PowerShell.
Nenhuma migração contém `CREATE DATABASE`, `USE` ou `DROP`.

**Se você já executou o SQL antigo** (`Usuario`, `Pet`, etc.), não aplique os
scripts manualmente por cima. O migrador recusa uma base com tabelas sem seu
histórico. Preserve o banco e os dados; será necessária uma migração de conversão
após inspeção e backup. Esta primeira versão é para a base vazia que foi testada
no Docker. O banco antigo `resgate_mapeamento_db` não é tocado.

## Como as migrações funcionam

Cada arquivo é executado uma vez. `controle_migracoes` registra nome, SHA-256,
estado e horários. Novas alterações entram como `003_descricao.sql`, depois
`004_descricao.sql`, e assim por diante. Não editar nem remover migrações já
aplicadas. A comparação normaliza CRLF para LF, para funcionar no Windows.

O processo recusa numeração repetida, arquivos removidos/alterados, ordem
incompatível e execução incompleta. Uma trava MySQL na mesma conexão evita duas
execuções simultâneas. A segunda execução encerra sem reaplicar o que já terminou.

**DDL no MySQL não tem rollback completo entre instruções.** Se uma migração
falhar após criar alguma tabela, seu registro fica `EM_EXECUCAO`. O comando para
no primeiro erro. Inspecionar o estado real e preparar recuperação; nunca apagar
o volume, usar `--force` ou marcar como aplicada sem validar o resultado. Uma
falha pode também deixar mudanças da migração parcialmente aplicadas.

O migrador é de **desenvolvimento/CI via Docker**. Para hospedagem gerenciada,
será necessário adaptar a conexão com TLS e credenciais de migração separadas.
Não executar migrações automaticamente em cada requisição ou inicialização de
função serverless.

## Dados de exemplo e bairros

Não há conta administrativa ou senha padrão. A criação do primeiro administrador
deve ser feita pelo fluxo de autenticação, com hash válido e promoção controlada
por módulo. `senha_hash` não transforma senhas automaticamente.

Os testes geram usuários com `example.invalid`, bairro fictício e chat dentro de
transações que são revertidas. Eles não são uma carga para produção, nem contas
com login funcional. Só executar em banco descartável.

A carga de bairros é uma entrega pendente: obter e revisar a lista de Votorantim
com a prefeitura, incluindo áreas rurais e equivalências de nomes, e criar uma
migração própria. As coordenadas de cada bairro precisam de uma fonte geográfica
revisada; ViaCEP não retorna latitude/longitude. Sem coordenadas, a ocorrência
pode ser listada, mas não deve ganhar um ponto inventado no mapa.

## Testes e CI

A workflow `.github/workflows/banco.yml` inicia MySQL vazio, aplica as migrações,
repete o comando e testa as regras com dados fictícios. Usa o mesmo `compose.yaml`
do desenvolvimento. A remoção de volumes nessa workflow ocorre apenas no runner
descartável do GitHub Actions, nunca no computador dos integrantes.

Para executar os testes numa cópia **descartável** do ambiente:

```powershell
$env:BANCO_TESTE = '1'
node database/tests/integridade.mjs
Remove-Item Env:BANCO_TESTE
```

Testes SQL não comprovam autorização da API: antes de publicar, testar acesso de
usuário anônimo, dono, terceiro e administrador de cada módulo nas rotas reais.

## Situação atual (04/11/2026)

As APIs de Next.js, login, CRUD, fotos, moderação e chat **já estão implementados** em `web/`. Este documento é centrado no banco e nas migrações. A CI inclui testes SQL, testes HTTP reais em MySQL isolado e teste de restauração de backup. A publicação pública, a lista geográfica oficial de bairros, o Banco de Ração e o envio de recuperação de senha sem configurar provedor permanecem fora da entrega local. Não modifique migrações aplicadas; acrescente novas versões.
