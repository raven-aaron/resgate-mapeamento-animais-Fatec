-- Usar SOMENTE no MySQL descartável do job de integração.
SET @autor_ci := (SELECT id_usuario FROM usuarios WHERE email='ci-autor@example.invalid');
SET @especie_ci := (SELECT id_especie FROM especies WHERE nome='Cachorro' LIMIT 1);
INSERT INTO bairros (nome,latitude_aproximada,longitude_aproximada)
VALUES ('Bairro fictício HTTP CI',-23.540000,-47.450000)
ON DUPLICATE KEY UPDATE id_bairro=LAST_INSERT_ID(id_bairro);
SET @bairro_ci := LAST_INSERT_ID();
INSERT INTO animais (nome,id_especie,sexo,porte) VALUES ('Animal CI isolado',@especie_ci,'MACHO','MEDIO');
SET @animal_ci := LAST_INSERT_ID();
INSERT INTO ocorrencias (id_usuario_criador,id_animal,id_bairro,tipo_ocorrencia,status_aprovacao,
status_caso,data_evento,cep,latitude_aproximada,longitude_aproximada,origem_localizacao,precisao_localizacao)
VALUES (@autor_ci,@animal_ci,@bairro_ci,'PERDIDO','PENDENTE','ABERTO',CURDATE(),
'18110000',-23.540000,-47.450000,'BAIRRO','BAIRRO_APROXIMADO');

-- Animal encontrado cujo autor é administrador. Valida o chat da conta ADM.
SET @admin_ci := (SELECT id_usuario FROM usuarios WHERE email='ci-admin@example.invalid');
INSERT INTO animais (nome,id_especie,sexo,porte)
VALUES ('Animal encontrado ADM CI',@especie_ci,'FEMEA','PEQUENO');
SET @animal_adm_ci := LAST_INSERT_ID();
INSERT INTO ocorrencias (id_usuario_criador,id_animal,id_bairro,tipo_ocorrencia,status_aprovacao,
status_caso,data_evento,cep,latitude_aproximada,longitude_aproximada,origem_localizacao,precisao_localizacao)
VALUES (@admin_ci,@animal_adm_ci,@bairro_ci,'ENCONTRADO','APROVADO','ABERTO',CURDATE(),
'18110000',-23.540000,-47.450000,'BAIRRO','BAIRRO_APROXIMADO');
