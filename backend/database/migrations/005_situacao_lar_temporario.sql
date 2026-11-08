ALTER TABLE ocorrencias
    ADD COLUMN situacao_lar_temporario ENUM(
        'PODE_ACOLHER',
        'NAO_PODE_ACOLHER'
    ) NULL COMMENT 'Situação do lar temporário, aplicável somente a novos registros encontrados',
    ADD CONSTRAINT ck_ocorrencias_lar_temporario_tipo CHECK (
        situacao_lar_temporario IS NULL
        OR tipo_ocorrencia = 'ENCONTRADO'
    );
