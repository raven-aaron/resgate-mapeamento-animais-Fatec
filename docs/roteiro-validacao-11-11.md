# Validação para a apresentação de 11/11/2026
## Objetivo
Demonstrar o fluxo completo, real e persistente do módulo de resgate animal: cidadão cria uma ocorrência; a equipe administrativa analisa; o público consulta; outro cidadão conversa com o autor; o autor atualiza ou encerra a ocorrência. Nenhum dado de demonstração é fingido na interface.

## Preparação (executar no computador usado na apresentação)
1. `git switch feat/banco-resgate-modulos` e `git pull origin feat/banco-resgate-modulos`.
2. Conferir o `.env` local sem expor credenciais. **Nunca enviar o `.env` ao GitHub.**
3. Com Docker Desktop aberto: `docker compose up -d --build`, `node database/scripts/migrar.mjs`, `node database/scripts/migrar.mjs --status`.
4. Se o volume npm estiver desatualizado: `docker compose run --rm --no-deps web npm ci` e `docker compose restart web`.
5. Confirmar `docker compose ps` (MySQL saudável e web Up) e `docker compose logs --tail=30 web` (Next.js Ready).
6. Criar o administrador local, caso necessário: `docker compose exec web node scripts/criar-admin.mjs`.
7. Preparar **três sessões separadas**: cidadão autor, administrador e cidadão interessado (outro e-mail). Evitar compartilhar o mesmo perfil do navegador.
8. Separar duas imagens de animais criadas para a demonstração e um CEP válido de Votorantim que identifique bairro e posição pública aproximada. Testar a conexão com a internet antes da apresentação.

## Roteiro funcional, com resultado esperado
| Nº | Ação | Resultado esperado |
| --- | --- | --- |
| 1 | Abrir `/cadastro` e registrar cidadão | Conta criada; login sem erro |
| 2 | Abrir `/ocorrencias/nova?tipo=PERDIDO`, adicionar foto e CEP | Bairro identificado, sem escolha livre do pin; prévia das fotos |
| 3 | Revisar e tentar enviar sem concordar | Modal de privacidade impede o envio |
| 4 | Marcar o consentimento e enviar | Solicitação criada, **em análise**, gravada no MySQL |
| 5 | Abrir `/admin/solicitacoes` como ADM | Solicitação visível; prévia administrativa e foto disponíveis |
| 6 | Aprovar | Histórico registrado, status alterado para aprovado |
| 7 | Abrir `/mapa` como visitante | Marcador com foto e nome; cartaz completo abre e filtros funcionam |
| 8 | Como segundo cidadão, iniciar chat no cartaz | Conversa criada entre autor e interessado, sem exibir telefone/e-mail |
| 9 | Enviar e responder mensagens em duas sessões | Histórico atualizado; terceiro usuário sem acesso à conversa |
| 10 | Como autor, abrir `/minhas-ocorrencias` e editar detalhes | Edição salva; ocorrência volta a **Em análise** e sai temporariamente do mapa |
| 11 | Como ADM, aprovar novamente | Nova versão reaparece no mapa após atualização |
| 12 | Como autor, marcar **Animal reencontrado** | Caso resolvido; desaparece do mapa público; histórico de chat permanece |
| 13 | Cadastrar outra ocorrência e usar **Excluir cadastro** | Exclusão lógica; desaparece das listagens; histórico preservado |
| 14 | Como ADM, acessar `/admin/estatisticas` e `/admin/mapa-termico` | Indicadores consultam registros do MySQL; não devem expor endereços exatos |

## Testes negativos indispensáveis
- Usuário A não pode editar, encerrar ou excluir uma ocorrência criada pelo usuário B, mesmo alterando o ID da URL.
- Um visitante não deve acessar fotos pendentes nem os chats privados.
- Um cidadão comum não deve conseguir acessar `/admin` nem aprovar ocorrências.
- CEP fora de Votorantim ou sem bairro verificável deve ser rejeitado; coordenadas enviadas pelo navegador são ignoradas.
- Ocorrência encerrada/excluída não aparece no mapa e não aceita mensagens novas.
- Rejeição ou ocultação administrativa exige motivo.

## Responsividade
Testar pelo menos 375 px (celular), 768 px (tablet) e 1280 px (desktop) no DevTools:
- Página inicial, cadastro, tela de ocorrência, mapa com popup e foto, cartaz, chat e painel ADM.
- Verificar se não existe rolagem horizontal inesperada, texto cortado ou botão inacessível.
- Verificar navegação por teclado e legibilidade das mensagens.

## Limitações explicitamente reconhecidas
- O banco e as fotos são locais do computador em execução; GitHub sincroniza **código**, não os dados dos volumes.
- Envio de recuperação de senha por e-mail depende de configuração de serviço externo; não demonstrar como funcional sem configurar e testar.
- A validação do CEP e os mapas dependem de provedores externos e da internet.
- O módulo de Banco de Ração e serviços municipais fora de Resgate dependem de escopo/implementação próprios do outro grupo.
- A posição pública do bairro é aproximada, não um endereço residencial. O CEP digitado pelo usuário não prova onde o animal estava.
- Não utilizar o servidor de desenvolvimento como hospedagem pública. Uma implantação real precisa de HTTPS, backups, política de privacidade, testes e armazenamento persistente.

## Critério de pronto
Todos os itens 1–14 funcionando em um único ambiente de apresentação, com banco íntegro, logs sem erros, acesso separado por perfil e três tamanhos de tela revisados. Registrar qualquer falha antes de declarar a apresentação pronta.
