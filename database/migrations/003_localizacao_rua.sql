-- Evolução aditiva: preserva todas as ocorrências existentes.
-- A verificação do CEP de Votorantim (IBGE 3557006) ocorre no backend.
-- Nunca registrar número residencial, complemento, endereço completo ou GPS exato do usuário.

ALTER TABLE ocorrencias
    ADD COLUMN cep CHAR(8) NULL COMMENT 'CEP validado no backend via ViaCEP, apenas oito digitos',
    ADD COLUMN logradouro VARCHAR(160) NULL COMMENT 'Nome da rua retornado pelo ViaCEP, sem numero',
    ADD COLUMN latitude_aproximada DECIMAL(9,6) NULL COMMENT 'Pin publico aproximado; nao indica imovel',
    ADD COLUMN longitude_aproximada DECIMAL(9,6) NULL,
    ADD COLUMN origem_localizacao ENUM('RUA', 'AJUSTE_USUARIO', 'BAIRRO') NULL,
    ADD COLUMN precisao_localizacao ENUM('RUA_APROXIMADA', 'BAIRRO_APROXIMADO') NULL,
    ADD CONSTRAINT ck_ocorrencias_cep CHECK (cep IS NULL OR cep REGEXP '^[0-9]{8}$'),
    ADD CONSTRAINT ck_ocorrencias_coordenadas CHECK (
        (latitude_aproximada IS NULL AND longitude_aproximada IS NULL)
        OR (latitude_aproximada BETWEEN -90 AND 90 AND longitude_aproximada BETWEEN -180 AND 180)
    ),
    ADD CONSTRAINT ck_ocorrencias_localizacao_tipo CHECK (
        (latitude_aproximada IS NULL AND longitude_aproximada IS NULL AND origem_localizacao IS NULL AND precisao_localizacao IS NULL)
        OR (latitude_aproximada IS NOT NULL AND longitude_aproximada IS NOT NULL AND origem_localizacao IS NOT NULL AND precisao_localizacao IS NOT NULL)
    );

CREATE INDEX idx_ocorrencias_pins ON ocorrencias
    (status_aprovacao, status_caso, excluido_em, latitude_aproximada, longitude_aproximada);

-- A tabela bairros permanece como catalogo incremental, preenchido somente
-- pelo backend a partir de resposta validada do ViaCEP, sem carga manual.
-- A collation utf8mb4_unicode_ci da chave unica nome ja compara sem diferenciar
-- caixa e diversos acentos; normalizar espacos e grafia antes do INSERT.
-- Não geocodificar endereço residencial: geocodificar a rua sem número e
-- confirmar um ponto aproximado, com limites de deslocamento e validação municipal.
