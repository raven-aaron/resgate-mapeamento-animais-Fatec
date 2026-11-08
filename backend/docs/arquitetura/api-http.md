# API HTTP — módulo Resgate

Base local: `http://localhost:3000/api`; ambiente DEMO: `http://localhost:3001/api`.

As rotas são implementadas em `frontend/src/app/api/` com Route Handlers do Next.js. Não há servidor Express separado nem ORM: as consultas usam `mysql2/promise` em `frontend/src/lib/db.ts`.

## Autenticação e respostas

As APIs recebem e retornam JSON, exceto o cadastro e a edição de fotografias (`multipart/form-data`) e a consulta ao arquivo de imagem (JPEG, PNG ou WebP).

- Cidadão: cookie `resgate_sessao`; administrador: cookie `resgate_admin_sessao`.
- Cookies são `HttpOnly` e `SameSite=Lax`. O servidor valida as sessões no MySQL.
- Requisições que alteram dados verificam `Origin` contra o `Host` público.
- Respostas de sucesso usam `{ "ok": true }`, campos específicos do endpoint ou objetos nomeados; erros retornam `{ "erro": "..." }`.
- Códigos frequentes: 200 (consulta/alteração), 201 (criação), 400 (dados inválidos), 401 (sessão ausente), 403 (sem permissão), 404 (não encontrado), 409 (conflito), 413 (limite de tamanho), 422 (localização não confirmada), 429 (limite de requisições), 500/502/503 (falha interna, envio de e-mail ou serviço indisponível).

## Contas e sessões

| Método | Rota | Entrada / retorno principal |
| --- | --- | --- |
| POST | `/api/auth/cadastro` | JSON: `nome`, `email`, `telefone`, `senha`. Retorna `{ok,nome}`; cria sessão |
| POST | `/api/auth/login` | JSON: `email`, `senha`, `manterConectado?`, `admin?`. Retorna `{ok,adminResgate}` |
| GET | `/api/auth/me` | Retorna `{usuario}`, com `null` caso não autenticado |
| POST | `/api/auth/logout` | Encerra as sessões de cidadão e administrativa |
| GET | `/api/auth/admin/me` | Retorna `{usuario}` de sessão administrativa ou `null` |
| POST | `/api/auth/admin/logout` | Encerra as sessões administrativa e de cidadão |
| POST | `/api/auth/recuperar` | JSON: `nome`, `email`. Exige configuração de e-mail; retorna mensagem genérica |
| POST | `/api/auth/redefinir` | JSON: `token`, `senha`. Valida token e revoga sessões anteriores |

A recuperação por e-mail só envia mensagens quando `RESEND_API_KEY`, `MAIL_FROM` e `APP_PUBLIC_URL` estão configurados.

## Ocorrências e fotos

| Método | Rota | Autorização | Contrato |
| --- | --- | --- | --- |
| GET | `/api/ocorrencias` | Pública | Query: `especie?`, `porte?`, `sexo?`, `tipo?`. Retorna até 200 itens em `{ocorrencias:[...]}` |
| POST | `/api/ocorrencias` | Cidadão | Multipart: `dados` (JSON serializado), `confirmacao_privacidade=confirmado`, `fotos` (0 a 5). Retorna `{id,status:"PENDENTE",mensagem}` com HTTP 201 |
| GET | `/api/ocorrencias/[id]` | Pública | Retorna `{ocorrencia}` somente se aprovada, aberta e não excluída |
| PATCH | `/api/ocorrencias/[id]` | Criador | JSON: `acao:"EDITAR"` com `nome`, `sexo`, `porte`, `idade`, `microchip`, `raca`, `cor`, `descricao`, `referencia`, `dataEvento` e `cep?`; ou `acao:"ENCERRAR"`, `motivo`, `detalhe?` |
| DELETE | `/api/ocorrencias/[id]` | Criador | Exclusão lógica: define `excluido_em`, encerra conversas; retorna `{ok,mensagem}` |
| POST | `/api/ocorrencias/[id]/fotos` | Criador | Multipart: `fotos` (1 a 5 por envio, até cinco no total). Retorna `{ok,fotos:[...]}` |
| DELETE | `/api/ocorrencias/[id]/fotos` | Criador | JSON: `{idFoto}`. Retorna `{ok,fotos:[...]}` |
| GET | `/api/fotos/[arquivo]` | Pública quando publicada; caso contrário, criador ou administrador | Retorna arquivo JPEG/PNG/WebP mediante validação de acesso |

**Cadastro:** `dados` aceita `tipo`, `especie`, `nome`, `raca`, `sexo`, `porte`, `cor`, `idade`, `microchip`, `dataEvento` (AAAA-MM-DD, não futura), `descricao`, `cep` (oito dígitos), `referencia` e `situacaoLarTemporario`. Nome é obrigatório para animal perdido; espécie é `Cachorro` ou `Gato`. Para `ENCONTRADO`, `situacaoLarTemporario` aceita `PODE_ACOLHER` ou `NAO_PODE_ACOLHER`; para `PERDIDO`, deve ser omitido, nulo ou vazio. O servidor valida o CEP e calcula a região; não confia nas coordenadas enviadas pelo navegador.

O cadastro HTTP não exige fotos; aceita de zero a cinco, com até 5 MB por imagem. A interface também não exige uma foto. A API atual não impede a aprovação administrativa de uma ocorrência sem fotos.

Edições de ficha e mudanças nas fotos retornam a ocorrência para `PENDENTE`. A edição não altera espécie, tipo nem `situacaoLarTemporario`. Encerramento aceita motivos `REENCONTRADO`, `DEVOLVIDO_AO_TUTOR`, `DUPLICIDADE` e `OUTRO`, observadas as regras do tipo e da justificativa.

Na tela pública de mapa/cards, a busca por texto, bairro e intervalo de datas é aplicada no cliente aos resultados recebidos; não são parâmetros de `/api/ocorrencias`. Os filtros de espécie, porte, sexo e tipo são enviados à API.

Exemplo de listagem:

```http
GET /api/ocorrencias?tipo=PERDIDO&especie=Cachorro
```

```json
{
  "ocorrencias": [
    {
      "id": 12,
      "nome": "Mel",
      "especie": "Cachorro",
      "tipo": "PERDIDO",
      "bairro": "Vossoroca",
      "status_aprovacao": "APROVADO",
      "status_caso": "ABERTO",
      "foto": "/api/fotos/<arquivo-uuid>.jpg"
    }
  ]
}
```

O trecho é **exemplo do formato dos campos**, não um registro obtido de uma base real.

## Administração

| Método | Rota | Contrato |
| --- | --- | --- |
| GET | `/api/admin/ocorrencias?status=PENDENTE&pagina=1` | Retorna 10 ocorrências por página e total filtrado; aceita `PENDENTE`, `APROVADO`, `REJEITADO`, `OCULTO`, `TODAS`, além dos filtros `busca`, `aprovacao`, `especie`, `tipo` e `ordem` |
| PATCH | `/api/admin/ocorrencias` | JSON: `{id,acao:"APROVAR"|"REJEITAR"|"OCULTAR",motivo?}`. Motivo de pelo menos cinco caracteres para rejeitar ou ocultar |
| PATCH | `/api/admin/usuarios` | JSON: `{id,acao:"CONCEDER_ADMIN"|"REVOGAR_ADMIN",confirmacao:"email@..."}` |
| GET | `/api/admin/mapa-termico` | Retorna `{zonas:[...]}`, agrupadas por coordenadas aproximadas |

A administração exige sessão própria com permissão `ADMIN` para o módulo `RESGATE`. Uma ocorrência deve estar `PENDENTE` para ser aprovada ou rejeitada. O painel `/admin/usuarios` consulta as contas **diretamente no servidor da página**, não por um endpoint `GET /api/admin/usuarios`.

## Conversas e notificações

| Método | Rota | Contrato |
| --- | --- | --- |
| GET | `/api/conversas` | Lista até 100 conversas do cidadão com contadores de não lidas |
| POST | `/api/conversas` | JSON: `{ocorrencia: 12}`. Inicia ou recupera conversa |
| GET | `/api/conversas/[id]/mensagens` | Retorna `{conversa,mensagens,meuId}` com até 100 mensagens recentes |
| POST | `/api/conversas/[id]/mensagens` | JSON: `{conteudo}` (até 2.000 caracteres). Retorna `{id}` com HTTP 201 |
| PATCH | `/api/conversas/[id]/mensagens` | JSON: `{ateId}`. Marca como lidas mensagens recebidas até esse ID |
| GET | `/api/notificacoes` | Retorna até 60 notificações recentes e `{naoLidas,mensagensNaoLidas,ultimaMensagemNaoLida}` |
| PATCH | `/api/notificacoes` | JSON: `{id}` ou `{todas:true}` |

A conversa é entre o responsável pelo registro e outro cidadão. A aplicação não permite conversa consigo mesmo, e o envio de novas mensagens depende de uma ocorrência aberta e aprovada.

## Localização

| Método | Rota | Contrato |
| --- | --- | --- |
| GET | `/api/localizacao/cep?cep=181xxxxx` | Valida CEP de Votorantim e retorna `cep`, `bairro`, `cidade`, `uf`, `latitude`, `longitude`, `origem_localizacao`, `precisao_localizacao` e `aviso` |
| GET | `/api/localizacao/geocodificar?cep=181xxxxx` | Alias compatível: retorna os mesmos campos e aplica a mesma lógica de consulta de CEP |

O servidor consulta ViaCEP, OpenStreetMap/Nominatim e, quando necessário, BrasilAPI; a posição pública é arredondada para uma região aproximada. Se não for possível confirmar a região, o cadastro não inventa um ponto.

## Onde estão os contratos

Cada contrato é implementado no respectivo arquivo `route.ts` dentro de `frontend/src/app/api/`. A coleção `backend/insomnia/resgate-demo.insomnia-v4.json` contém exemplos executáveis para desenvolvimento.

Leia também [modelo de dados](modelo-dados.md), [dicionário de dados](dicionario-dados.md) e [guia de front-end](../frontend/guia-equipe.md).
