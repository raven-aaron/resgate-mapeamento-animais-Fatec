# Auditoria das ações clicáveis — projeto de Resgate

**Escopo:** páginas e componentes de `frontend/src/app` e `frontend/src/components`, incluindo os dois registros de animal, mapa, cartazes, conta, conversa, notificações, moderação e administração. A auditoria é estática, sobre os controles do repositório; o teste de renderização final requer abertura dos fluxos no navegador depois do deploy.

## Cadastro e autenticação
| Tela / grupo | Principais ações e variantes |
| --- | --- |
| Home | PERDI MEU PET — laranja; ENCONTREI UM PET — verde; VER NO MAPA — laranja |
| Registrar animal perdido / encontrado (formulário compartilhado) | PRÓXIMO e SALVAR — verde; VOLTAR — cinza; CANCELAR cadastro — vermelho |
| Cadastro completo / revisão | REVISAR, ENVIAR, CONCORDO — verde; VOLTAR E REVISAR — cinza; CANCELAR cadastro — vermelho |
| Cadastro de conta / login | CRIAR CONTA e ENTRAR — verde; JÁ TENHO CONTA / VOLTAR — cinza |
| Recuperar / redefinir senha | RECUPERAR / SALVAR NOVA SENHA — verde; VOLTAR PARA LOGIN — cinza |
| Editar ocorrência | SALVAR E ENVIAR — verde; VALIDAR CEP — cinza; REMOVER FOTO e CANCELAR EDIÇÃO — vermelho |
| Menu lateral / cabeçalho | Abrir menu — verde da identidade visual; fechar, acessibilidade e busca — controles neutros, sem vermelho |

## Conta, busca e comunicação
| Tela / grupo | Principais ações e variantes |
| --- | --- |
| Minhas ocorrências, cada cartão | VER PUBLICAÇÃO — laranja; EDITAR DADOS — cinza; CORRIGIR E REENVIAR (rejeitada) — laranja; RESOLVIDA — verde; EXCLUIR — vermelho |
| Minhas ocorrências, rodapé | Minhas conversas — cinza; CADASTRAR ANIMAL — verde; Ver mapa público — laranja |
| Minha conta do cidadão | Minhas ocorrências — laranja; Minhas conversas — cinza; Notificações — contorno; Sair — vermelho |
| Minha conta administrativa | Voltar ao painel — cinza; Conversas — laranja; Notificações — contorno; Sair — vermelho |
| Caixa de conversas | VOLTAR AO PERFIL — cinza; ATIVAR AVISOS — verde (ativado: contorno); NOTIFICAÇÕES — laranja |
| Filtro de conversas | Todas / Não lidas: selecionado — verde; inativo — contorno |
| Conversa individual | ENVIAR MENSAGEM — verde; links de retorno sem preenchimento |
| Lista de notificações | MARCAR TODAS COMO LIDAS — verde; ABRIR — contorno; MARCAR LIDA — verde |
| Mapa público e cartazes | Ver em cartazes / Ver no mapa / VER CARTAZ — laranja; filtro — neutro; modo ativo — verde e inativo — cinza |
| Filtros do mapa | APLICAR FILTROS — verde; seleção por rádio com distinção de status |
| Galeria de fotos | Setas anterior/próxima: ambas neutras por serem funções equivalentes |

## Administração
| Tela / grupo | Principais ações e variantes |
| --- | --- |
| Painel administrativo | Solicitações pendentes — verde; demais registros — cinza |
| Cartão administrativo | VER DETALHES — laranja; ACEITAR — verde; NEGAR / OCULTAR — vermelho |
| Lista administrativa | ATUALIZAR LISTA — cinza; FILTROS — contorno |
| Modal de filtro | APLICAR FILTROS — verde; LIMPAR FILTROS — cinza |
| Modal de aprovação / rejeição | CONFIRMAR — verde para aprovação, vermelho para rejeição/ocultação; CANCELAR (fechar modal) — cinza |
| Gerenciar usuários | BUSCAR / CONFIRMAR ALTERAÇÃO — verde; LIMPAR — cinza |
| Cartaz administrativo | VOLTAR À ADMINISTRAÇÃO — cinza |

## Controles equivalentes e verificação
- Controles de acessibilidade (A+, A− e contraste) e setas de galeria são deliberadamente neutros e não ganham cores diferentes por estética.
- `CustomButton` aceita `green`, `orange`, `gray`, `outline` e `red`; botões nativos de menu/paginação usam seu CSS específico.
- Os testes automatizados verificam variantes de grupos que causaram regressões. Antes da apresentação, verificar visualmente no desktop e no celular; não confundir build bem-sucedido com validação visual completa.
