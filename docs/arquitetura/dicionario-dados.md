# Dicionário de dados

Gerado a partir da proposta SQL. As restrições e relações completas estão em `database/migrations/001_estrutura.sql`. Todos os IDs são `INT UNSIGNED`; datas/horas devem ser gravadas em UTC.

## `usuarios`

| Campo | Definição SQL |
| --- | --- |
| `id_usuario` | `INT UNSIGNED AUTO_INCREMENT PRIMARY KEY` |
| `nome` | `VARCHAR(100) NOT NULL` |
| `email` | `VARCHAR(254) NOT NULL` |
| `senha_hash` | `VARCHAR(255) NOT NULL` |
| `telefone` | `VARCHAR(20) NULL COMMENT 'Privado e opcional; nunca aparece em respostas públicas'` |
| `situacao` | `ENUM('ATIVO', 'SUSPENSO', 'DESATIVADO') NOT NULL DEFAULT 'ATIVO'` |
| `criado_em` | `DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` |
| `atualizado_em` | `DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)` |

## `permissoes_usuarios`

| Campo | Definição SQL |
| --- | --- |
| `id_usuario` | `INT UNSIGNED NOT NULL` |
| `modulo` | `ENUM('RESGATE', 'RACAO') NOT NULL` |
| `papel` | `ENUM('ADMIN') NOT NULL DEFAULT 'ADMIN'` |
| `criado_em` | `DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` |

## `sessoes`

| Campo | Definição SQL |
| --- | --- |
| `id_sessao` | `INT UNSIGNED AUTO_INCREMENT PRIMARY KEY` |
| `id_usuario` | `INT UNSIGNED NOT NULL` |
| `token_hash` | `BINARY(32) NOT NULL COMMENT 'SHA-256 de token aleatório; não é o token do cookie'` |
| `criado_em` | `DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` |
| `expira_em` | `DATETIME(3) NOT NULL` |
| `revogada_em` | `DATETIME(3) NULL` |

## `recuperacoes_senha`

| Campo | Definição SQL |
| --- | --- |
| `id_recuperacao` | `INT UNSIGNED AUTO_INCREMENT PRIMARY KEY` |
| `id_usuario` | `INT UNSIGNED NOT NULL` |
| `token_hash` | `BINARY(32) NOT NULL` |
| `criado_em` | `DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` |
| `expira_em` | `DATETIME(3) NOT NULL` |
| `utilizado_em` | `DATETIME(3) NULL` |

## `bairros`

| Campo | Definição SQL |
| --- | --- |
| `id_bairro` | `INT UNSIGNED AUTO_INCREMENT PRIMARY KEY` |
| `nome` | `VARCHAR(100) NOT NULL` |
| `cidade` | `VARCHAR(80) NOT NULL DEFAULT 'Votorantim'` |
| `uf` | `CHAR(2) NOT NULL DEFAULT 'SP'` |
| `codigo_ibge` | `CHAR(7) NOT NULL DEFAULT '3557006'` |
| `latitude_aproximada` | `DECIMAL(9,6) NULL COMMENT 'Ponto público representativo do bairro, nunca uma residência'` |
| `longitude_aproximada` | `DECIMAL(9,6) NULL` |
| `ativo` | `BOOLEAN NOT NULL DEFAULT TRUE` |

## `especies`

| Campo | Definição SQL |
| --- | --- |
| `id_especie` | `INT UNSIGNED AUTO_INCREMENT PRIMARY KEY` |
| `nome` | `VARCHAR(50) NOT NULL` |
| `ativo` | `BOOLEAN NOT NULL DEFAULT TRUE` |

## `racas`

| Campo | Definição SQL |
| --- | --- |
| `id_raca` | `INT UNSIGNED AUTO_INCREMENT PRIMARY KEY` |
| `id_especie` | `INT UNSIGNED NOT NULL` |
| `nome` | `VARCHAR(80) NOT NULL` |
| `ativo` | `BOOLEAN NOT NULL DEFAULT TRUE` |

## `cores`

| Campo | Definição SQL |
| --- | --- |
| `id_cor` | `INT UNSIGNED AUTO_INCREMENT PRIMARY KEY` |
| `nome` | `VARCHAR(50) NOT NULL` |
| `ativo` | `BOOLEAN NOT NULL DEFAULT TRUE` |

## `animais`

| Campo | Definição SQL |
| --- | --- |
| `id_animal` | `INT UNSIGNED AUTO_INCREMENT PRIMARY KEY` |
| `nome` | `VARCHAR(80) NULL` |
| `id_especie` | `INT UNSIGNED NOT NULL` |
| `id_raca` | `INT UNSIGNED NULL COMMENT 'NULL significa raça desconhecida'` |
| `sexo` | `ENUM('MACHO', 'FEMEA', 'INDETERMINADO') NOT NULL DEFAULT 'INDETERMINADO'` |
| `porte` | `ENUM('PEQUENO', 'MEDIO', 'GRANDE', 'INDETERMINADO') NOT NULL DEFAULT 'INDETERMINADO'` |
| `possui_microchip` | `BOOLEAN NULL DEFAULT NULL COMMENT 'NULL: desconhecido; 0: não; 1: sim'` |
| `idade_aproximada` | `VARCHAR(30) NULL` |
| `caracteristicas` | `TEXT NULL` |
| `criado_em` | `DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` |
| `atualizado_em` | `DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)` |

## `animais_cores`

| Campo | Definição SQL |
| --- | --- |
| `id_animal` | `INT UNSIGNED NOT NULL` |
| `id_cor` | `INT UNSIGNED NOT NULL` |

## `ocorrencias`

| Campo | Definição SQL |
| --- | --- |
| `id_ocorrencia` | `INT UNSIGNED AUTO_INCREMENT PRIMARY KEY` |
| `id_usuario_criador` | `INT UNSIGNED NOT NULL` |
| `id_animal` | `INT UNSIGNED NOT NULL COMMENT 'Ficha descritiva exclusiva desta ocorrência'` |
| `id_bairro` | `INT UNSIGNED NOT NULL` |
| `ponto_referencia` | `VARCHAR(255) NULL COMMENT 'Referência pública aproximada, sem endereço residencial'` |
| `tipo_ocorrencia` | `ENUM('PERDIDO', 'ENCONTRADO') NOT NULL` |
| `status_aprovacao` | `ENUM('PENDENTE', 'APROVADO', 'REJEITADO', 'OCULTO') NOT NULL DEFAULT 'PENDENTE'` |
| `status_caso` | `ENUM('ABERTO', 'RESOLVIDO', 'ENCERRADO') NOT NULL DEFAULT 'ABERTO'` |
| `motivo_encerramento` | `ENUM('REENCONTRADO', 'DEVOLVIDO_AO_TUTOR', 'ADOTADO', 'FALECIMENTO', 'DUPLICIDADE', 'OUTRO') NULL` |
| `detalhe_encerramento` | `VARCHAR(500) NULL` |
| `descricao` | `TEXT NULL` |
| `encerrado_em` | `DATETIME(3) NULL` |
| `excluido_em` | `DATETIME(3) NULL COMMENT 'Exclusão lógica: não aparece no público nem permite novas conversas'` |
| `criado_em` | `DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` |
| `atualizado_em` | `DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)` |

## `fotos_ocorrencias`

| Campo | Definição SQL |
| --- | --- |
| `id_foto` | `INT UNSIGNED AUTO_INCREMENT PRIMARY KEY` |
| `id_ocorrencia` | `INT UNSIGNED NOT NULL` |
| `provedor` | `VARCHAR(30) NOT NULL COMMENT 'Exemplo: CLOUDINARY; não contém credenciais'` |
| `identificador_arquivo` | `VARCHAR(255) NOT NULL COMMENT 'Identificador usado para apagar/substituir o arquivo no provedor'` |
| `url_foto` | `VARCHAR(2048) NOT NULL` |
| `ordem` | `TINYINT UNSIGNED NOT NULL COMMENT '1 é a capa; limite inicial de cinco fotos por ocorrência'` |
| `criado_em` | `DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` |

## `historico_ocorrencias`

| Campo | Definição SQL |
| --- | --- |
| `id_historico` | `INT UNSIGNED AUTO_INCREMENT PRIMARY KEY` |
| `id_ocorrencia` | `INT UNSIGNED NOT NULL` |
| `id_usuario_responsavel` | `INT UNSIGNED NOT NULL` |
| `acao` | `ENUM('CRIACAO', 'EDICAO', 'APROVACAO', 'REJEICAO', 'OCULTACAO', 'REABERTURA', 'ENCERRAMENTO', 'EXCLUSAO', 'RESTAURACAO') NOT NULL` |
| `motivo` | `VARCHAR(500) NULL` |
| `dados_anteriores` | `JSON NULL COMMENT 'Somente campos alterados e estados; sem senhas, tokens ou dados de contato'` |
| `dados_novos` | `JSON NULL` |
| `criado_em` | `DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` |

## `conversas`

| Campo | Definição SQL |
| --- | --- |
| `id_conversa` | `INT UNSIGNED AUTO_INCREMENT PRIMARY KEY` |
| `id_ocorrencia` | `INT UNSIGNED NOT NULL` |
| `id_usuario_interessado` | `INT UNSIGNED NOT NULL` |
| `situacao` | `ENUM('ATIVA', 'ENCERRADA', 'BLOQUEADA') NOT NULL DEFAULT 'ATIVA'` |
| `criado_em` | `DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` |
| `atualizado_em` | `DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` |

## `mensagens`

| Campo | Definição SQL |
| --- | --- |
| `id_mensagem` | `INT UNSIGNED AUTO_INCREMENT PRIMARY KEY` |
| `id_conversa` | `INT UNSIGNED NOT NULL` |
| `id_remetente` | `INT UNSIGNED NOT NULL` |
| `conteudo` | `TEXT NOT NULL` |
| `enviado_em` | `DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` |
| `lida_em` | `DATETIME(3) NULL` |

## `notificacoes`

| Campo | Definição SQL |
| --- | --- |
| `id_notificacao` | `INT UNSIGNED AUTO_INCREMENT PRIMARY KEY` |
| `id_usuario` | `INT UNSIGNED NOT NULL` |
| `modulo` | `ENUM('RESGATE', 'RACAO') NOT NULL` |
| `tipo` | `VARCHAR(50) NOT NULL` |
| `id_ocorrencia` | `INT UNSIGNED NULL` |
| `id_conversa` | `INT UNSIGNED NULL` |
| `texto` | `VARCHAR(255) NOT NULL COMMENT 'Texto curto sem dados pessoais nem conteúdo de mensagens privadas'` |
| `criado_em` | `DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` |
| `lida_em` | `DATETIME(3) NULL` |

## `auditoria`

| Campo | Definição SQL |
| --- | --- |
| `id_auditoria` | `INT UNSIGNED AUTO_INCREMENT PRIMARY KEY` |
| `id_usuario_responsavel` | `INT UNSIGNED NOT NULL` |
| `modulo` | `ENUM('CONTAS', 'RESGATE', 'RACAO') NOT NULL` |
| `acao` | `VARCHAR(80) NOT NULL` |
| `entidade` | `VARCHAR(80) NOT NULL` |
| `id_registro` | `INT UNSIGNED NULL COMMENT 'Referência informativa; entidade pode pertencer a qualquer módulo'` |
| `detalhe` | `VARCHAR(500) NULL COMMENT 'Não armazenar senha, token, corpo de mensagem ou dados pessoais'` |
| `criado_em` | `DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)` |

## `controle_migracoes`

Criada pelo migrador. Tabela técnica.

| Campo | Definição |
| --- | --- |
| `arquivo` | `VARCHAR(150) PRIMARY KEY` |
| `resumo_sha256` | `CHAR(64) NOT NULL` |
| `situacao` | `ENUM('EM_EXECUCAO', 'APLICADA') NOT NULL` |
| `iniciado_em` | `DATETIME(3) NOT NULL` |
| `aplicado_em` | `DATETIME(3) NULL` |
