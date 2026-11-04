-- Catálogo alinhado ao formulário de raças caninas do PI do primeiro semestre.
-- "Sem raça definida" já existe por espécie na migração 002.
-- O sistema de resgate só oferece Cachorro e Gato; preservamos Outro
-- como registro inativo para não apagar dados de instalações existentes.
UPDATE especies SET ativo = 0 WHERE nome = 'Outro';

INSERT INTO racas (id_especie, nome)
SELECT e.id_especie, r.nome FROM especies e
CROSS JOIN (
  SELECT 'Beagle' AS nome UNION ALL
  SELECT 'Border Collie' AS nome UNION ALL
  SELECT 'Boxer' AS nome UNION ALL
  SELECT 'Bulldog Francês' AS nome UNION ALL
  SELECT 'Chow Chow' AS nome UNION ALL
  SELECT 'Cocker Spaniel' AS nome UNION ALL
  SELECT 'Salsicha' AS nome UNION ALL
  SELECT 'Golden Retriever' AS nome UNION ALL
  SELECT 'Husky Siberiano' AS nome UNION ALL
  SELECT 'Labrador' AS nome UNION ALL
  SELECT 'Lhasa' AS nome UNION ALL
  SELECT 'Maltês' AS nome UNION ALL
  SELECT 'Pastor Alemão' AS nome UNION ALL
  SELECT 'Sheltie' AS nome UNION ALL
  SELECT 'Pequinês' AS nome UNION ALL
  SELECT 'Pinscher' AS nome UNION ALL
  SELECT 'Pitbull / American Staffordshire Terrier' AS nome UNION ALL
  SELECT 'Spitz Alemão' AS nome UNION ALL
  SELECT 'Poodle' AS nome UNION ALL
  SELECT 'Pug' AS nome UNION ALL
  SELECT 'Rottweiler' AS nome UNION ALL
  SELECT 'Shih-tzu' AS nome UNION ALL
  SELECT 'Yorkshire Terrier' AS nome
) AS r
WHERE e.nome = 'Cachorro';
