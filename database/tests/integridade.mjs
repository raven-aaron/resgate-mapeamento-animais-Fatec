import assert from 'node:assert/strict';
import { consultar } from '../scripts/mysql.mjs';

// Somente banco descartável de CI/teste. Fixtures estão dentro de transações.
// Um erro fecha a conexão, revertendo todas as inserções dessa execução.
if (process.env.BANCO_TESTE !== '1') {
  throw new Error('Defina BANCO_TESTE=1 somente em uma base descartável de teste.');
}
const inicio = `
START TRANSACTION;
INSERT INTO usuarios (nome, email, senha_hash) VALUES ('Tutor fictício', 'tutor@example.invalid', 'SEM_LOGIN_FIXTURE'); SET @dono = LAST_INSERT_ID();
INSERT INTO usuarios (nome, email, senha_hash) VALUES ('Interessado fictício', 'interessado@example.invalid', 'SEM_LOGIN_FIXTURE'); SET @interessado = LAST_INSERT_ID();
INSERT INTO usuarios (nome, email, senha_hash) VALUES ('Terceiro fictício', 'terceiro@example.invalid', 'SEM_LOGIN_FIXTURE'); SET @terceiro = LAST_INSERT_ID();
INSERT INTO bairros (nome) VALUES ('BAIRRO FICTICIO APENAS TESTE'); SET @bairro = LAST_INSERT_ID();
SELECT id_especie INTO @cachorro FROM especies WHERE nome = 'Cachorro';
SELECT id_especie INTO @gato FROM especies WHERE nome = 'Gato';
SELECT id_raca INTO @raca_gato FROM racas WHERE id_especie = @gato LIMIT 1;
INSERT INTO animais (nome, id_especie) VALUES ('Animal fictício', @cachorro); SET @animal = LAST_INSERT_ID();
INSERT INTO ocorrencias (id_usuario_criador, id_animal, id_bairro, tipo_ocorrencia, status_aprovacao, data_evento)
VALUES (@dono, @animal, @bairro, 'PERDIDO', 'APROVADO', '2026-01-01'); SET @ocorrencia = LAST_INSERT_ID();
INSERT INTO conversas (id_ocorrencia, id_usuario_interessado) VALUES (@ocorrencia, @interessado); SET @conversa = LAST_INSERT_ID();
`;
let total = 0;
function rejeita(nome, sql, mensagem) {
  assert.throws(() => consultar(inicio + sql + '\nROLLBACK;'), mensagem, nome);
  console.log(`OK: ${nome}`);
  total++;
}
rejeita('cidade diferente de Votorantim', "INSERT INTO bairros (nome, cidade) VALUES ('Outro lugar', 'Paris');", /ck_bairros_municipio/);
rejeita('coordenada incompleta', 'UPDATE bairros SET latitude_aproximada = -23.5 WHERE id_bairro = @bairro;', /ck_bairros_coordenadas/);
rejeita('raça de outra espécie', 'UPDATE animais SET id_raca = @raca_gato WHERE id_animal = @animal;', /fk_animais_raca_especie/);
rejeita('usuário conversa consigo mesmo', 'INSERT INTO conversas (id_ocorrencia, id_usuario_interessado) VALUES (@ocorrencia, @dono);', /interessado diferente do criador/);
rejeita('conversa duplicada', 'INSERT INTO conversas (id_ocorrencia, id_usuario_interessado) VALUES (@ocorrencia, @interessado);', /uq_conversas_interessado/);
rejeita('conversa em ocorrência pendente', "UPDATE ocorrencias SET status_aprovacao = 'PENDENTE' WHERE id_ocorrencia = @ocorrencia; INSERT INTO conversas (id_ocorrencia, id_usuario_interessado) VALUES (@ocorrencia, @terceiro);", /ocorrencia aprovada/);
rejeita('remetente fora da conversa', "INSERT INTO mensagens (id_conversa, id_remetente, conteudo) VALUES (@conversa, @terceiro, 'Texto');", /Remetente nao participa/);
rejeita('envio em chat bloqueado', "UPDATE conversas SET situacao = 'BLOQUEADA' WHERE id_conversa = @conversa; INSERT INTO mensagens (id_conversa, id_remetente, conteudo) VALUES (@conversa, @dono, 'Texto');", /Envio bloqueado/);
rejeita('envio em ocorrência oculta', "UPDATE ocorrencias SET status_aprovacao = 'OCULTO' WHERE id_ocorrencia = @ocorrencia; INSERT INTO mensagens (id_conversa, id_remetente, conteudo) VALUES (@conversa, @dono, 'Texto');", /Envio bloqueado/);
rejeita('mensagem vazia', "INSERT INTO mensagens (id_conversa, id_remetente, conteudo) VALUES (@conversa, @dono, '  ');", /ck_mensagens_conteudo/);
rejeita('edição do autor de mensagem', "INSERT INTO mensagens (id_conversa, id_remetente, conteudo) VALUES (@conversa, @dono, 'Texto'); UPDATE mensagens SET id_remetente = @interessado WHERE id_conversa = @conversa;", /Mensagem enviada nao pode/);
rejeita('troca de criador da ocorrência', 'UPDATE ocorrencias SET id_usuario_criador = @terceiro WHERE id_ocorrencia = @ocorrencia;', /Criador e ficha/);
rejeita('troca de participante da conversa', 'UPDATE conversas SET id_usuario_interessado = @terceiro WHERE id_conversa = @conversa;', /Participantes e ocorrencia/);
rejeita('exclusão destrutiva do usuário com ocorrência', 'DELETE FROM usuarios WHERE id_usuario = @dono;', /foreign key constraint fails/i);
rejeita('encerramento sem motivo e data', "UPDATE ocorrencias SET status_caso = 'RESOLVIDO' WHERE id_ocorrencia = @ocorrencia;", /ck_ocorrencias_encerramento/);
rejeita('mais de cinco fotos', "INSERT INTO fotos_ocorrencias (id_ocorrencia, provedor, identificador_arquivo, url_foto, ordem) VALUES (@ocorrencia, 'TESTE', 'arquivo', 'https://example.invalid/foto.jpg', 6);", /ck_fotos_ordem/);
rejeita('sessão expirada antes de começar', "INSERT INTO sessoes (id_usuario, token_hash, criado_em, expira_em) VALUES (@dono, UNHEX(SHA2('token-ficticio',256)), '2026-01-02', '2026-01-01');", /ck_sessoes_prazo/);

const resultado = consultar(inicio + `
INSERT INTO permissoes_usuarios (id_usuario, modulo) VALUES (@dono, 'RACAO');
INSERT INTO mensagens (id_conversa, id_remetente, conteudo) VALUES (@conversa, @interessado, 'Olá, vi este animal.');
INSERT INTO mensagens (id_conversa, id_remetente, conteudo) VALUES (@conversa, @dono, 'Obrigado!');
UPDATE mensagens SET lida_em = CURRENT_TIMESTAMP(3) WHERE id_conversa = @conversa;
UPDATE ocorrencias SET status_caso = 'RESOLVIDO', motivo_encerramento = 'REENCONTRADO', encerrado_em = CURRENT_TIMESTAMP(3) WHERE id_ocorrencia = @ocorrencia;
INSERT INTO historico_ocorrencias (id_ocorrencia, id_usuario_responsavel, acao, motivo) VALUES (@ocorrencia, @dono, 'ENCERRAMENTO', 'Teste fictício');
SELECT CONCAT('mensagens=', COUNT(*)) FROM mensagens WHERE id_conversa = @conversa AND lida_em IS NOT NULL;
SELECT CONCAT('admin_resgate=', COUNT(*)) FROM permissoes_usuarios WHERE id_usuario = @dono AND modulo = 'RESGATE';
SELECT CONCAT('resolvido=', COUNT(*)) FROM ocorrencias WHERE id_ocorrencia = @ocorrencia AND status_caso = 'RESOLVIDO';
ROLLBACK;
`);
assert.equal(resultado, 'mensagens=2\nadmin_resgate=0\nresolvido=1');
assert.equal(consultar("SELECT COUNT(*) FROM usuarios WHERE email LIKE '%@example.invalid';"), '0');
console.log(`OK: fluxo válido, permissão por módulo e rollback. ${total + 1} verificações concluídas.`);
