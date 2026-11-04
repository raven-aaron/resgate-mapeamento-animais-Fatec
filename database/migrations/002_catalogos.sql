-- Catálogos básicos de desenvolvimento e produção. Não contêm usuários ou bairros fictícios.
INSERT INTO especies (nome) VALUES ('Cachorro'), ('Gato'), ('Outro');
INSERT INTO racas (id_especie, nome)
SELECT id_especie, 'Sem raça definida' FROM especies WHERE nome IN ('Cachorro', 'Gato');
INSERT INTO cores (nome) VALUES
    ('Preta'), ('Branca'), ('Marrom'), ('Caramelo'), ('Cinza'), ('Amarela'), ('Laranja'), ('Outra');
-- Raça desconhecida: animais.id_raca = NULL. Cor desconhecida: nenhuma linha em animais_cores.
-- Bairros: carregar somente uma lista revisada de Votorantim, em migração própria.
