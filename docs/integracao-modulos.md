# Contrato de integração e divisão do trabalho

> **Nota de manutenção (04/11/2026):** esta página registra o contrato arquitetural original e contém exemplos de rotas propostos antes da implementação. Para as rotas **efetivas**, consulte `web/src/app/api/`. O estado operacional e os comandos atualizados estão em [README](../README.md) e [ambiente Docker](ambiente-docker.md). Administradores do Resgate não podem alterar a situação global da conta; a API permite apenas conceder/revogar o papel ADMIN do módulo RESGATE.

## Portal e limites entre os grupos

Proposta: mesma aplicação Next.js, mesmo login e um MySQL por ambiente. Código de
interface comum: `Cabecalho`, `Rodape`, navegação, tema e contato institucional
estático. Não criar tabelas para esses componentes. Rotas de resgate e ração ficam
separadas; também separar serviços, validações e permissões no backend.

`usuarios` identifica a conta. Usuário comum não recebe permissão administrativa.
`permissoes_usuarios` pode conter `(id_usuario, RESGATE, ADMIN)`, `(id_usuario, RACAO,
ADMIN)` ou ambas. A sessão identifica o usuário; o backend consulta o módulo em cada
ação administrativa. Nunca aceitar papel/modulo administrativo do formulário de
cadastro. ADMIN de um módulo não ganha acesso automático às mensagens privadas nem
aos dados administrativos do outro.

Suspensão em `usuarios.situacao` vale para o portal inteiro. Até existir uma regra
de gestão central das contas, essa operação fica restrita à operação responsável
pelo portal, não ao ADMIN de ração ou resgate isoladamente. Se o produto precisar
de suspensão por módulo, criar essa capacidade explicitamente antes da tela de
gestão correspondente. Não reinterpretar a suspensão global como local.

Dados específicos do módulo de ração devem ficar em tabelas próprias, por exemplo
uma tabela de cadastro referenciando `id_usuario`, **depois que os requisitos forem
definidos**. Cadastro de beneficiário, catálogo de produtos, estoque, doação e
retirada são coisas diferentes: não criar todos sem saber qual é o módulo.
Não adicionar CPF, renda ou endereço completo a `usuarios` só por antecipação.

## Contrato proposto da ocorrência

Entrada do usuário autenticado (exemplo de estrutura, IDs devem vir dos catálogos):

```json
{
  "animal": {
    "nome": null,
    "id_especie": 1,
    "id_raca": null,
    "sexo": "INDETERMINADO",
    "porte": "MEDIO",
    "possui_microchip": null,
    "idade_aproximada": "Adulto",
    "caracteristicas": "Mancha branca no peito",
    "ids_cores": [1, 2]
  },
  "id_bairro": 1,
  "ponto_referencia": "Próximo à praça do bairro",
  "tipo_ocorrencia": "ENCONTRADO",
  "data_evento": "2026-10-28",
  "descricao": "Animal visto na região durante a tarde",
  "ids_uploads": ["identificador-temporario-validado-pelo-servidor"]
}
```

Não confiar nos IDs deste exemplo como dados reais. O backend obtém `id_usuario_criador`
da sessão, força aprovação PENDENTE/caso ABERTO e valida cada upload como pertencente
ao usuário. O cliente não fornece URL arbitrária para o servidor baixar.

Transação: criar ficha do animal, vínculos de cores, ocorrência, metadados de fotos
e histórico CRIACAO. Uploads externos não participam da transação SQL: preparar os
arquivos primeiro, validar propriedade e limpar uploads órfãos em caso de falha.
Notificação administrativa pode ser gravada na mesma transação SQL.

Resposta pública: ID da ocorrência, ficha do animal, tipo, status permitido,
data do evento, bairro/cidade/UF, referência revisada e fotos aprovadas. Não retornar
`SELECT *` nem dados da conta: email, telefone, senha_hash, sessão ou tokens. Preferir
um DTO explícito. Campo público de coordenadas significa sempre ponto do bairro.

## Rotas sugeridas para iniciar frontend e backend

Estas rotas são um contrato proposto; **não estão implementadas nesta PR**.

| Rota | Acesso | Comportamento |
| --- | --- | --- |
| `GET /api/catalogos` | Público | Espécies, raças, cores e bairros ativos. |
| `POST /api/contas` | Público com proteção antiabuso | Cadastro sem privilégio administrativo. |
| `POST /api/sessoes` | Público com proteção antiabuso | Login; cookie HttpOnly/Secure/SameSite adequado. |
| `DELETE /api/sessoes/atual` | Autenticado | Revogar a sessão. |
| `POST /api/recuperacoes-senha` | Público com resposta genérica | Iniciar recuperação sem revelar se email existe. |
| `POST /api/recuperacoes-senha/confirmar` | Token válido | Consumir token uma vez, trocar hash e revogar sessões em transação. |
| `GET /api/ocorrencias` | Público | Apenas aprovadas/não excluídas; filtros e paginação. |
| `GET /api/ocorrencias/{id}` | Público ou dono/admin, conforme estado | Separar projeção pública de detalhe privado pendente. |
| `POST /api/ocorrencias` | Autenticado | Criar o conjunto acima numa transação. |
| `PATCH /api/ocorrencias/{id}` | Dono ou ADMIN RESGATE | Editar campos permitidos, voltar para revisão e registrar histórico. |
| `DELETE /api/ocorrencias/{id}` | Dono ou ADMIN RESGATE | Exclusão lógica, histórico e retirada do público. |
| `POST /api/ocorrencias/{id}/encerramento` | Dono ou ADMIN RESGATE | Validar motivo e registrar baixa. |
| `POST /api/ocorrencias/{id}/moderacao` | ADMIN RESGATE | Aprovar/rejeitar/ocultar; exigir motivo conforme ação. |
| `POST /api/ocorrencias/{id}/conversas` | Autenticado, diferente do dono | Criar ou devolver conversa já existente. |
| `GET /api/conversas` | Autenticado | Somente conversas em que participa. |
| `GET/POST /api/conversas/{id}/mensagens` | Participante | Paginar histórico/enviar texto; validar estado. |
| `PATCH /api/conversas/{id}/leitura` | Participante destinatário | Marcar somente mensagens recebidas. |
| `GET/PATCH /api/notificacoes` | Dono | Listar/marcar apenas seus avisos. |

Rota de upload e DTOs finais dependem do provedor de arquivos. Para uma hospedagem
serverless, começar o chat com consulta periódica autenticada e envio HTTP;
WebSocket não é um requisito do modelo SQL. Avaliar intervalo/cotas no provedor
escolhido. Não conectar navegador diretamente ao MySQL.

Sessões aqui seguem uma proposta de token opaco aleatório no cookie, apenas hash
no banco. A implementação precisa de revisão de segurança ou biblioteca compatível.
Se escolher uma biblioteca com tabelas próprias, adaptar por migração antes de
implementar o login, sem manter dois sistemas de sessão concorrentes. Para senhas,
usar hash adaptativo via biblioteca mantida; SHA-256 aqui é só para tokens aleatórios,
não para senha. Recuperação também depende de provedor/canal de envio de email.

## Consultas que não precisam de novas tabelas

Mapa e mapa de calor: agrupar ocorrências aprovadas/não excluídas por `id_bairro`
e usar coordenada aproximada revisada. Contadores por espécie usam `animais` e
`especies`. Taxa de reencontro deve contar motivos positivos, não toda baixa.
Estatísticas públicas excluem pendentes/rejeitadas/ocultas/excluídas; administrativas
têm filtros e acesso próprios. Avaliar agregação de regiões com poucos registros
antes da publicação. Não criar tabela separada para cada gráfico.

## Divisão das entregas

| Responsável | Entrega concreta | Critério de aceite |
| --- | --- | --- |
| Grupo de BD | Revisar modelo/DER, validar nomes, preparar catálogo real de bairros e novas migrações | Banco vazio reproduzível, sem dados reais; CI do banco verde. |
| Backend resgate | Driver/pool, consultas parametrizadas, autenticação, transações e rotas | Testes de CRUD e autorização com dono/terceiro/admin por módulo. |
| Frontend resgate | Formulários e telas usando os contratos | Trabalhar com fixtures e IDs do catálogo; sem credenciais ou SQL no navegador. |
| Raven/infra | Integração da PR, CI, variáveis, ambientes, uploads, publicação e backup | Ambiente reproduzível; segredos fora do Git; migração validada antes de publicar. |
| Grupo ração | Explicar o cadastro e seus dados/regras; projetar tabelas próprias | Compartilhar conta por ID se a arquitetura for aprovada; permissões isoladas. |
| Equipes juntas | Confirmar login/portal compartilhados e responsáveis por dados comuns | Não duplicar cadastro de usuário nem permitir que admin de um módulo administre o outro. |

## Antes de liberar dados reais e publicar

1. Revisar e integrar o esquema; carregar bairros reais e coordenadas revisadas.
2. Implementar pool MySQL no backend e testar conexões/transações. No Docker:
   `DB_HOST=mysql`, porta 3306. Do host: `127.0.0.1`, porta 3307.
3. Implementar login, recuperação, permissões, uploads privados/moderação e CRUD.
4. Testar o fluxo completo entre dois usuários e um moderador, incluindo tentativas
   de ler chats de terceiros e alterar papéis.
5. Confirmar ofertas gratuitas vigentes para aplicação, MySQL, fotos e email,
   limites de conexões/armazenamento/tráfego, TLS, suporte a triggers e backups.
   Este pacote não cria contas nem contrata serviços. Não trocar MySQL por outro
   motor implicitamente, pois exigiria converter SQL e integração.
6. Separar credenciais de migração/execução e ambiente local/publicado. Revisar
   retenção, remoção de fotos, restauração de backup e limites de uso.

Esta entrega torna a proposta de banco e sua reprodução concretas. A aplicação
ainda precisa das implementações acima para ser considerada funcional e publicada.
