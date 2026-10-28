# Modelo revisado do banco — versão proposta

Data: 28/10/2026. Base: SQL e DER enviados pelo grupo.

## Decisão de arquitetura

Um MySQL por ambiente. Cada integrante usa seu Docker local; a publicação terá
uma base compartilhada própria, sem dados de testes. Manter `resgate_animais`,
nome que já consta no Compose e no `.env.example`. Um nome técnico do banco não
define limites de permissão. Fotos são arquivos em serviço de armazenamento;
o SQL guarda identificação e metadados. Não armazenar imagens em BLOB neste projeto.

A proposta de integração é um portal Next.js com contas compartilhadas e módulos
separados. Header, footer, identidade visual e contato institucional ficam em
componentes/configurações do frontend. Compartilhar aparência não obriga os grupos
a compartilhar banco: se ração tiver outro sistema/login, essa arquitetura deve
ser revista antes da integração. Não há implantação de ração nesta entrega.

## Revisão das sete tabelas originais

| Original | Revisão | Motivo |
| --- | --- | --- |
| `Usuario` | `usuarios`, `permissoes_usuarios`, `sessoes`, `recuperacoes_senha` | Hash explícito, estado de conta e administração por módulo; usuário comum não recebe linha de permissão administrativa. |
| `Pet` | `animais`, apoiada por `especies`, `racas`, `cores`, `animais_cores` | Nome em português e filtros padronizados; várias cores sem texto separado por vírgulas. |
| `Localizacao` | `bairros` + `ocorrencias.ponto_referencia` | Remover residência exata, cidade livre e localização duplicada por ocorrência. |
| `Ocorrencia` | `ocorrencias` + `historico_ocorrencias` | Separar publicação de andamento do caso e registrar decisões, autores, motivos e mudanças. |
| `Foto` | `fotos_ocorrencias` | Guardar identificador do arquivo, provedor, ordem e URL; permitir exclusão no serviço externo. |
| `Chat_Conversa` | `conversas` | Derivar anunciante da ocorrência, evitando um segundo campo que poderia apontar para outra pessoa. |
| `Chat_Mensagem` | `mensagens` | Validar participação e usar `lida_em` para saber quando houve leitura. |

Complementos: `notificacoes`, `auditoria` e a tabela técnica `controle_migracoes`.
O desenho enviado representa localização como 1:1, mas o SQL original não impõe
unicidade em `id_localizacao`. Na revisão, muitos registros compartilham um bairro,
e cada ocorrência mantém sua própria referência aproximada.

## Todas as tabelas e suas responsabilidades

| Grupo | Tabelas | Responsabilidade |
| --- | --- | --- |
| Contas compartilhadas | `usuarios`, `permissoes_usuarios`, `sessoes`, `recuperacoes_senha` | Cadastro, permissões administrativas por módulo, sessões revogáveis e recuperação. |
| Catálogos | `bairros`, `especies`, `racas`, `cores` | Localidades permitidas e opções para formulários e filtros. |
| Resgate | `animais`, `animais_cores`, `ocorrencias`, `fotos_ocorrencias`, `historico_ocorrencias` | Ficha do animal, publicação, imagens, moderação e evolução. |
| Chat de resgate | `conversas`, `mensagens` | Conversa privada entre criador e interessado em uma ocorrência. |
| Compartilhado | `notificacoes`, `auditoria` | Avisos internos e operações administrativas sensíveis. |
| Infraestrutura | `controle_migracoes` | Versões da estrutura aplicadas, hashes e falhas. |

Total: 17 tabelas de aplicação e 1 técnica. Não há tabelas para contatos fixos,
header, footer, dashboard ou mapa de calor. Indicadores são consultas agregadas.
As tabelas específicas de ração não estão incluídas nesse total.

## Relacionamentos e cardinalidades

| Relação | Cardinalidade e regra |
| --- | --- |
| Usuário → ocorrência | 1:N; uma ocorrência tem exatamente um criador. |
| Usuário → permissão | 1:N; no máximo uma permissão administrativa por módulo. |
| Usuário → sessão/recuperação/notificação | 1:N; dados privados. |
| Espécie → raça | 1:N; nome da raça único dentro da espécie. |
| Espécie → animal | 1:N; raça opcional, quando preenchida deve pertencer à espécie escolhida. |
| Animal ↔ cor | N:N por `animais_cores`; nenhuma cor significa desconhecida. |
| Animal → ocorrência | 1:0..1 no SQL, com UNIQUE em `ocorrencias.id_animal`; criação normal insere os dois numa transação. |
| Bairro → ocorrência | 1:N; referência pertence à ocorrência. |
| Ocorrência → foto | 1:0..5 no SQL; API exige pelo menos uma foto antes de solicitar publicação. |
| Ocorrência → histórico | 1:N; API grava a alteração e o histórico na mesma transação. |
| Ocorrência → conversa | 1:N; no máximo uma conversa por interessado; sem conversar consigo mesmo. |
| Conversa → mensagem | 1:N; apenas os dois participantes podem enviar ou ler pela API. |

### Por que a ficha do animal é exclusiva da ocorrência?

O sistema ainda não tem um cadastro mestre de animais identificados e tutores
comprovados. Dois usuários podem descrever o mesmo animal independentemente. Ligar
as duas publicações ao mesmo registro permitiria que uma edição mudasse a ficha
do outro usuário e o histórico. Por isso, esta versão trata `animais` como a ficha
descritiva daquela ocorrência. Não há correspondência automática nem deduplicação
de animais implementada. Uma futura carteira de pets ou controle de beneficiários
da ração exige uma identidade própria; não deve reaproveitar essas fichas sem análise.

### Semântica dos dados desconhecidos

Nome e raça podem ser desconhecidos. `possui_microchip = NULL` é diferente de
`FALSE`: significa que ninguém verificou. Não guardar número de microchip neste
escopo. Sexo e porte aceitam `INDETERMINADO`. Idade aproximada permanece texto para
preservar a simplicidade do grupo; não usar esse campo para filtros numéricos.

## Estados da ocorrência

| Campo | Valores | Uso |
| --- | --- | --- |
| `tipo_ocorrencia` | `PERDIDO`, `ENCONTRADO` | O acontecimento registrado. |
| `status_aprovacao` | `PENDENTE`, `APROVADO`, `REJEITADO`, `OCULTO` | Controle da publicação. |
| `status_caso` | `ABERTO`, `RESOLVIDO`, `ENCERRADO` | Situação do caso. |

`EM_ANDAMENTO` foi retirado porque não havia diferença de comportamento definida
em relação a `ABERTO`. Se o grupo definir uma etapa real de atendimento, poderá
adicioná-la em migração futura. `RESOLVIDO` representa solução positiva, por exemplo
reencontro/devolução; `ENCERRADO` permite baixa por duplicidade, falecimento ou outro
motivo sem contar esses registros como reencontros. A API deve validar a combinação
de motivo e estado. Ambos exigem motivo e data no banco.

Criação pública: sempre pendente. Aprovação/rejeição/ocultação: somente ADMIN de
RESGATE. Alterar ficha, localização, descrição ou fotos de publicação aprovada
retorna a ocorrência a PENDENTE, na mesma transação e com histórico. Rejeição e
ocultação exigem motivo na API. Estado aprovado sozinho não autoriza exposição se
`excluido_em` estiver preenchido. Lista principal filtra também caso aberto;
casos resolvidos podem aparecer em histórico público separado, com os mesmos filtros
de aprovação e exclusão. Não implementar rascunhos públicos.

Criador e ficha vinculada não podem ser trocados por UPDATE. A edição altera os
campos da ficha e da ocorrência, não a autoria. Ocorrência encerrada não recebe
novas conversas. Conversas existentes podem continuar até serem encerradas, se a
ocorrência permanecer aprovada; ocultação/exclusão bloqueia novos envios.

## Votorantim e localização aproximada

1. Município fixo: Votorantim/SP, código IBGE **3557006**.
2. Formulário recebe `id_bairro` de uma lista controlada de bairros ativos.
3. Backend confirma que o ID existe e está ativo. Não aceita cidade, UF, latitude,
   longitude ou criação livre de bairro no cadastro de ocorrência.
4. Referência opcional: praça, escola, parque ou estabelecimento público próximo.
   Orientar o usuário a não informar número residencial nem contato pessoal.
5. A administração revisa textos e fotos antes de publicar. Retirar EXIF/GPS das imagens.
6. Mapa usa ponto representativo do bairro; não são coordenadas do desaparecimento.
   Os campos aceitam NULL até que a localização do bairro seja revisada.

`DEFAULT 'Votorantim'` sozinho não restringe nada. Aqui, CHECK fixa município/UF/IBGE
e a FK vincula cada ocorrência ao catálogo. Isso não prova que o nome do bairro ou
suas coordenadas são verdadeiros: a curadoria do catálogo continua necessária.
O CHECK de latitude/longitude valida faixa e preenchimento conjunto, não o limite
geográfico municipal. Não basta arredondar uma coordenada residencial.

**ViaCEP é auxiliar, opcional.** O backend consulta um CEP com oito dígitos e valida
retorno `erro`, `ibge == '3557006'` e `uf == 'SP'`. O bairro retornado precisa ser
mapeado para o catálogo, sem cadastrá-lo automaticamente. CEP inexistente ou de
outra cidade gera erro explícito. Se o serviço estiver indisponível, a lista local
de bairros continua disponível. Não é necessário armazenar o CEP, logradouro,
complemento ou número residencial para o módulo de resgate.

Validar CEP limita o endereço declarado, mas **não comprova residência nem impede
alguém de selecionar um bairro falso**. A regra atual é território das ocorrências,
não verificação documental de munícipes. Se ração exigir elegibilidade por residência,
esse é outro fluxo, privado, a ser definido pelo grupo responsável.

## Exclusão, retenção e armazenamento externo

As relações principais usam restrição de exclusão: apagar um usuário com ocorrência
ou mensagem não elimina seu histórico em cascata. `usuarios.situacao` desativa acesso,
e `ocorrencias.excluido_em` retira publicação. Exclusão lógica não é uma política de
retenção: antes de usar dados reais, definir prazos e procedimento de anonimização/
eliminação, inclusive mensagens, arquivos externos e backups. Uma operação específica
de limpeza precisa respeitar a ordem das FKs e não deve ser um DELETE casual.

CASCADE é usado apenas para dependentes descartáveis: sessões, recuperações,
permissões, notificações do usuário e vínculo animal/cor. Não há cascata automática
da conta até ocorrências, conversas e mensagens.

Remover a linha de uma foto não apaga o arquivo do provedor. O backend precisa
realizar a remoção externa e tratar falhas/repetições. Upload inicialmente privado;
só expor URLs de fotos aprovadas. O serviço/fluxo escolhido deve permitir retirada
de conteúdo e revisão antes da divulgação. Limite proposto: cinco fotos por
ocorrência, 5 MB por arquivo, JPEG/PNG/WebP; validar tipo real, tamanho e metadados
no backend. A cota por arquivo é regra de aplicação, não do SQL.

## Responsabilidades que o SQL não substitui

- Autenticação, cookies seguros, hash de senha e validação de tokens.
- Autorização por usuário/módulo, inclusive leitura de mensagens e notificações.
- Validação de usuário ativo e sessão não expirada/revogada em toda operação privada.
- Transações que gravam histórico junto com alterações e controle de concorrência
  com bloqueio da linha de ocorrência/conversa quando necessário.
- Validação de data de evento não futura, catálogo ativo e foto obrigatória.
- Proteção contra spam, consultas parametrizadas e limites de requisições.
- Paginação por cursor, seleção explícita de campos públicos e teste de acessos indevidos.

Os triggers cobrem integridade do chat e autoria, mas não conhecem a sessão HTTP.
Um invasor usando a credencial SQL da aplicação poderia se passar por um usuário:
por isso somente o backend deve acessar MySQL. A credencial local do Docker serve
para desenvolvimento; a hospedagem deve separar usuário de migração (DDL/TRIGGER)
de usuário de execução (somente permissões necessárias). Preservar TLS.

## Fontes técnicas consultadas

- [IBGE — Votorantim](https://www.ibge.gov.br/cidades-e-estados/sp/votorantim.html).
- [ViaCEP — documentação](https://viacep.com.br/).
- [MySQL 8.4 — chaves estrangeiras](https://dev.mysql.com/doc/refman/8.4/en/create-table-foreign-keys.html).
- [MySQL 8.4 — CHECK](https://dev.mysql.com/doc/refman/8.4/en/create-table-check-constraints.html).

Os nomes, limites e fluxos acima são decisões propostas para este projeto, não
requisitos impostos por essas fontes.
