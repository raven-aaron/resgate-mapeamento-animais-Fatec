-- MySQL 8.4. Executar pelo migrador, na base configurada no Docker.
-- Não cria outra base e não altera tabelas de uma instalação antiga.

CREATE TABLE usuarios (
    id_usuario INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) NULL COMMENT 'Privado e opcional; nunca aparece em respostas públicas',
    situacao ENUM('ATIVO', 'SUSPENSO', 'DESATIVADO') NOT NULL DEFAULT 'ATIVO',
    criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    atualizado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_usuarios_email (email),
    CONSTRAINT ck_usuarios_nome CHECK (CHAR_LENGTH(TRIM(nome)) BETWEEN 2 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE permissoes_usuarios (
    id_usuario INT UNSIGNED NOT NULL,
    modulo ENUM('RESGATE', 'RACAO') NOT NULL,
    papel ENUM('ADMIN') NOT NULL DEFAULT 'ADMIN',
    criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (id_usuario, modulo),
    CONSTRAINT fk_permissoes_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sessoes (
    id_sessao INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT UNSIGNED NOT NULL,
    token_hash BINARY(32) NOT NULL COMMENT 'SHA-256 de token aleatório; não é o token do cookie',
    criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    expira_em DATETIME(3) NOT NULL,
    revogada_em DATETIME(3) NULL,
    UNIQUE KEY uq_sessoes_token (token_hash),
    KEY idx_sessoes_usuario_expiracao (id_usuario, expira_em),
    KEY idx_sessoes_expiracao (expira_em),
    CONSTRAINT fk_sessoes_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
    CONSTRAINT ck_sessoes_prazo CHECK (expira_em > criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE recuperacoes_senha (
    id_recuperacao INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT UNSIGNED NOT NULL,
    token_hash BINARY(32) NOT NULL,
    criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    expira_em DATETIME(3) NOT NULL,
    utilizado_em DATETIME(3) NULL,
    UNIQUE KEY uq_recuperacoes_token (token_hash),
    KEY idx_recuperacoes_usuario (id_usuario, expira_em),
    KEY idx_recuperacoes_expiracao (expira_em),
    CONSTRAINT fk_recuperacoes_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
    CONSTRAINT ck_recuperacoes_prazo CHECK (expira_em > criado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bairros (
    id_bairro INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    cidade VARCHAR(80) NOT NULL DEFAULT 'Votorantim',
    uf CHAR(2) NOT NULL DEFAULT 'SP',
    codigo_ibge CHAR(7) NOT NULL DEFAULT '3557006',
    latitude_aproximada DECIMAL(9,6) NULL COMMENT 'Ponto público representativo do bairro, nunca uma residência',
    longitude_aproximada DECIMAL(9,6) NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE KEY uq_bairros_nome (nome),
    CONSTRAINT ck_bairros_nome CHECK (CHAR_LENGTH(TRIM(nome)) > 0),
    CONSTRAINT ck_bairros_municipio CHECK (cidade = 'Votorantim' AND uf = 'SP' AND codigo_ibge = '3557006'),
    CONSTRAINT ck_bairros_coordenadas CHECK (
        (latitude_aproximada IS NULL AND longitude_aproximada IS NULL)
        OR (latitude_aproximada IS NOT NULL AND longitude_aproximada IS NOT NULL
            AND latitude_aproximada BETWEEN -90 AND 90 AND longitude_aproximada BETWEEN -180 AND 180)
    ),
    CONSTRAINT ck_bairros_ativo CHECK (ativo IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE especies (
    id_especie INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE KEY uq_especies_nome (nome),
    CONSTRAINT ck_especies_ativo CHECK (ativo IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE racas (
    id_raca INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_especie INT UNSIGNED NOT NULL,
    nome VARCHAR(80) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE KEY uq_racas_especie_nome (id_especie, nome),
    UNIQUE KEY uq_racas_id_especie (id_raca, id_especie),
    CONSTRAINT fk_racas_especie FOREIGN KEY (id_especie) REFERENCES especies (id_especie),
    CONSTRAINT ck_racas_ativo CHECK (ativo IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cores (
    id_cor INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(50) NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    UNIQUE KEY uq_cores_nome (nome),
    CONSTRAINT ck_cores_ativo CHECK (ativo IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE animais (
    id_animal INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(80) NULL,
    id_especie INT UNSIGNED NOT NULL,
    id_raca INT UNSIGNED NULL COMMENT 'NULL significa raça desconhecida',
    sexo ENUM('MACHO', 'FEMEA', 'INDETERMINADO') NOT NULL DEFAULT 'INDETERMINADO',
    porte ENUM('PEQUENO', 'MEDIO', 'GRANDE', 'INDETERMINADO') NOT NULL DEFAULT 'INDETERMINADO',
    possui_microchip BOOLEAN NULL DEFAULT NULL COMMENT 'NULL: desconhecido; 0: não; 1: sim',
    idade_aproximada VARCHAR(30) NULL,
    caracteristicas TEXT NULL,
    criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    atualizado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    KEY idx_animais_filtros (id_especie, porte, sexo),
    CONSTRAINT fk_animais_especie FOREIGN KEY (id_especie) REFERENCES especies (id_especie),
    CONSTRAINT fk_animais_raca_especie FOREIGN KEY (id_raca, id_especie) REFERENCES racas (id_raca, id_especie),
    CONSTRAINT ck_animais_microchip CHECK (possui_microchip IS NULL OR possui_microchip IN (0, 1))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE animais_cores (
    id_animal INT UNSIGNED NOT NULL,
    id_cor INT UNSIGNED NOT NULL,
    PRIMARY KEY (id_animal, id_cor),
    CONSTRAINT fk_animais_cores_animal FOREIGN KEY (id_animal) REFERENCES animais (id_animal) ON DELETE CASCADE,
    CONSTRAINT fk_animais_cores_cor FOREIGN KEY (id_cor) REFERENCES cores (id_cor)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ocorrencias (
    id_ocorrencia INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario_criador INT UNSIGNED NOT NULL,
    id_animal INT UNSIGNED NOT NULL COMMENT 'Ficha descritiva exclusiva desta ocorrência',
    id_bairro INT UNSIGNED NOT NULL,
    ponto_referencia VARCHAR(255) NULL COMMENT 'Referência pública aproximada, sem endereço residencial',
    tipo_ocorrencia ENUM('PERDIDO', 'ENCONTRADO') NOT NULL,
    status_aprovacao ENUM('PENDENTE', 'APROVADO', 'REJEITADO', 'OCULTO') NOT NULL DEFAULT 'PENDENTE',
    status_caso ENUM('ABERTO', 'RESOLVIDO', 'ENCERRADO') NOT NULL DEFAULT 'ABERTO',
    motivo_encerramento ENUM('REENCONTRADO', 'DEVOLVIDO_AO_TUTOR', 'ADOTADO', 'FALECIMENTO', 'DUPLICIDADE', 'OUTRO') NULL,
    detalhe_encerramento VARCHAR(500) NULL,
    data_evento DATE NOT NULL,
    descricao TEXT NULL,
    encerrado_em DATETIME(3) NULL,
    excluido_em DATETIME(3) NULL COMMENT 'Exclusão lógica: não aparece no público nem permite novas conversas',
    criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    atualizado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_ocorrencias_animal (id_animal),
    KEY idx_ocorrencias_publicas (status_aprovacao, excluido_em, status_caso, data_evento, id_ocorrencia),
    KEY idx_ocorrencias_bairro (id_bairro, status_aprovacao, status_caso, data_evento),
    KEY idx_ocorrencias_criador (id_usuario_criador, criado_em),
    KEY idx_ocorrencias_tipo (tipo_ocorrencia, status_aprovacao, data_evento),
    CONSTRAINT fk_ocorrencias_criador FOREIGN KEY (id_usuario_criador) REFERENCES usuarios (id_usuario),
    CONSTRAINT fk_ocorrencias_animal FOREIGN KEY (id_animal) REFERENCES animais (id_animal),
    CONSTRAINT fk_ocorrencias_bairro FOREIGN KEY (id_bairro) REFERENCES bairros (id_bairro),
    CONSTRAINT ck_ocorrencias_encerramento CHECK (
        (status_caso = 'ABERTO' AND motivo_encerramento IS NULL AND encerrado_em IS NULL)
        OR (status_caso IN ('RESOLVIDO', 'ENCERRADO') AND motivo_encerramento IS NOT NULL AND encerrado_em IS NOT NULL)
    ),
    CONSTRAINT ck_ocorrencias_outro CHECK (
        motivo_encerramento IS NULL OR motivo_encerramento <> 'OUTRO'
        OR (detalhe_encerramento IS NOT NULL AND CHAR_LENGTH(TRIM(detalhe_encerramento)) > 0)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE fotos_ocorrencias (
    id_foto INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_ocorrencia INT UNSIGNED NOT NULL,
    provedor VARCHAR(30) NOT NULL COMMENT 'Exemplo: CLOUDINARY; não contém credenciais',
    identificador_arquivo VARCHAR(255) NOT NULL COMMENT 'Identificador usado para apagar/substituir o arquivo no provedor',
    url_foto VARCHAR(2048) NOT NULL,
    ordem TINYINT UNSIGNED NOT NULL COMMENT '1 é a capa; limite inicial de cinco fotos por ocorrência',
    criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_fotos_ordem (id_ocorrencia, ordem),
    UNIQUE KEY uq_fotos_arquivo (provedor, identificador_arquivo),
    CONSTRAINT fk_fotos_ocorrencia FOREIGN KEY (id_ocorrencia) REFERENCES ocorrencias (id_ocorrencia),
    CONSTRAINT ck_fotos_ordem CHECK (ordem BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE historico_ocorrencias (
    id_historico INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_ocorrencia INT UNSIGNED NOT NULL,
    id_usuario_responsavel INT UNSIGNED NOT NULL,
    acao ENUM('CRIACAO', 'EDICAO', 'APROVACAO', 'REJEICAO', 'OCULTACAO', 'REABERTURA', 'ENCERRAMENTO', 'EXCLUSAO', 'RESTAURACAO') NOT NULL,
    motivo VARCHAR(500) NULL,
    dados_anteriores JSON NULL COMMENT 'Somente campos alterados e estados; sem senhas, tokens ou dados de contato',
    dados_novos JSON NULL,
    criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    KEY idx_historico_ocorrencia (id_ocorrencia, id_historico),
    CONSTRAINT fk_historico_ocorrencia FOREIGN KEY (id_ocorrencia) REFERENCES ocorrencias (id_ocorrencia),
    CONSTRAINT fk_historico_usuario FOREIGN KEY (id_usuario_responsavel) REFERENCES usuarios (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE conversas (
    id_conversa INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_ocorrencia INT UNSIGNED NOT NULL,
    id_usuario_interessado INT UNSIGNED NOT NULL,
    situacao ENUM('ATIVA', 'ENCERRADA', 'BLOQUEADA') NOT NULL DEFAULT 'ATIVA',
    criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    atualizado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE KEY uq_conversas_interessado (id_ocorrencia, id_usuario_interessado),
    KEY idx_conversas_interessado (id_usuario_interessado, atualizado_em),
    CONSTRAINT fk_conversas_ocorrencia FOREIGN KEY (id_ocorrencia) REFERENCES ocorrencias (id_ocorrencia),
    CONSTRAINT fk_conversas_interessado FOREIGN KEY (id_usuario_interessado) REFERENCES usuarios (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mensagens (
    id_mensagem INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_conversa INT UNSIGNED NOT NULL,
    id_remetente INT UNSIGNED NOT NULL,
    conteudo TEXT NOT NULL,
    enviado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    lida_em DATETIME(3) NULL,
    KEY idx_mensagens_conversa (id_conversa, id_mensagem),
    KEY idx_mensagens_nao_lidas (id_conversa, lida_em, id_remetente),
    CONSTRAINT fk_mensagens_conversa FOREIGN KEY (id_conversa) REFERENCES conversas (id_conversa),
    CONSTRAINT fk_mensagens_remetente FOREIGN KEY (id_remetente) REFERENCES usuarios (id_usuario),
    CONSTRAINT ck_mensagens_conteudo CHECK (CHAR_LENGTH(TRIM(conteudo)) BETWEEN 1 AND 2000),
    CONSTRAINT ck_mensagens_leitura CHECK (lida_em IS NULL OR lida_em >= enviado_em)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notificacoes (
    id_notificacao INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario INT UNSIGNED NOT NULL,
    modulo ENUM('RESGATE', 'RACAO') NOT NULL,
    tipo VARCHAR(50) NOT NULL,
    id_ocorrencia INT UNSIGNED NULL,
    id_conversa INT UNSIGNED NULL,
    texto VARCHAR(255) NOT NULL COMMENT 'Texto curto sem dados pessoais nem conteúdo de mensagens privadas',
    criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    lida_em DATETIME(3) NULL,
    KEY idx_notificacoes_usuario (id_usuario, lida_em, id_notificacao),
    CONSTRAINT fk_notificacoes_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE,
    CONSTRAINT fk_notificacoes_ocorrencia FOREIGN KEY (id_ocorrencia) REFERENCES ocorrencias (id_ocorrencia),
    CONSTRAINT fk_notificacoes_conversa FOREIGN KEY (id_conversa) REFERENCES conversas (id_conversa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE auditoria (
    id_auditoria INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    id_usuario_responsavel INT UNSIGNED NOT NULL,
    modulo ENUM('CONTAS', 'RESGATE', 'RACAO') NOT NULL,
    acao VARCHAR(80) NOT NULL,
    entidade VARCHAR(80) NOT NULL,
    id_registro INT UNSIGNED NULL COMMENT 'Referência informativa; entidade pode pertencer a qualquer módulo',
    detalhe VARCHAR(500) NULL COMMENT 'Não armazenar senha, token, corpo de mensagem ou dados pessoais',
    criado_em DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    KEY idx_auditoria_modulo (modulo, criado_em),
    CONSTRAINT fk_auditoria_responsavel FOREIGN KEY (id_usuario_responsavel) REFERENCES usuarios (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estas regras envolvem várias tabelas e não cabem em CHECK do MySQL.
-- Autorização HTTP continua sendo obrigatória no backend.
DELIMITER $$
CREATE TRIGGER validar_dono_ocorrencia BEFORE UPDATE ON ocorrencias FOR EACH ROW
BEGIN
    IF NEW.id_usuario_criador <> OLD.id_usuario_criador OR NEW.id_animal <> OLD.id_animal THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Criador e ficha do animal da ocorrencia nao podem ser trocados';
    END IF;
END$$

CREATE TRIGGER validar_nova_conversa BEFORE INSERT ON conversas FOR EACH ROW
BEGIN
    DECLARE dono INT UNSIGNED;
    DECLARE publicacao VARCHAR(20);
    DECLARE caso VARCHAR(20);
    DECLARE exclusao DATETIME(3);
    SELECT id_usuario_criador, status_aprovacao, status_caso, excluido_em
      INTO dono, publicacao, caso, exclusao FROM ocorrencias WHERE id_ocorrencia = NEW.id_ocorrencia;
    IF dono IS NULL OR dono = NEW.id_usuario_interessado THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Conversa exige ocorrencia existente e interessado diferente do criador';
    END IF;
    IF publicacao <> 'APROVADO' OR caso <> 'ABERTO' OR exclusao IS NOT NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Nova conversa exige ocorrencia aprovada, aberta e nao excluida';
    END IF;
END$$

CREATE TRIGGER validar_alteracao_conversa BEFORE UPDATE ON conversas FOR EACH ROW
BEGIN
    IF NEW.id_ocorrencia <> OLD.id_ocorrencia OR NEW.id_usuario_interessado <> OLD.id_usuario_interessado THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Participantes e ocorrencia da conversa nao podem ser trocados';
    END IF;
END$$

CREATE TRIGGER validar_nova_mensagem BEFORE INSERT ON mensagens FOR EACH ROW
BEGIN
    DECLARE interessado INT UNSIGNED;
    DECLARE dono INT UNSIGNED;
    DECLARE estado VARCHAR(20);
    DECLARE publicacao VARCHAR(20);
    DECLARE exclusao DATETIME(3);
    SELECT c.id_usuario_interessado, o.id_usuario_criador, c.situacao, o.status_aprovacao, o.excluido_em
      INTO interessado, dono, estado, publicacao, exclusao
      FROM conversas c JOIN ocorrencias o ON o.id_ocorrencia = c.id_ocorrencia
      WHERE c.id_conversa = NEW.id_conversa;
    IF dono IS NULL OR NEW.id_remetente NOT IN (interessado, dono) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Remetente nao participa desta conversa';
    END IF;
    IF estado <> 'ATIVA' OR publicacao <> 'APROVADO' OR exclusao IS NOT NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Envio bloqueado para esta conversa ou ocorrencia';
    END IF;
END$$

CREATE TRIGGER atualizar_conversa_apos_mensagem AFTER INSERT ON mensagens FOR EACH ROW
BEGIN
    UPDATE conversas SET atualizado_em = CURRENT_TIMESTAMP(3) WHERE id_conversa = NEW.id_conversa;
END$$

CREATE TRIGGER validar_alteracao_mensagem BEFORE UPDATE ON mensagens FOR EACH ROW
BEGIN
    IF NEW.id_conversa <> OLD.id_conversa OR NEW.id_remetente <> OLD.id_remetente
       OR BINARY NEW.conteudo <> BINARY OLD.conteudo OR NEW.enviado_em <> OLD.enviado_em THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Mensagem enviada nao pode ter autor, conversa, texto ou data alterados';
    END IF;
END$$
DELIMITER ;
