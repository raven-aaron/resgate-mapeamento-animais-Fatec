# Modelo revisado do banco — versão proposta

Data: 28/10/2026. Base: SQL e DER enviados pelo grupo.

## Decisão de arquitetura

Um MySQL por ambiente. Cada integrante usa seu Docker local; a publicação terá
uma base compartilhada própria, sem dados de testes. Manter `resgate_animais`,
nome que já consta no Compose e no `.env.example`. Um nome técnico do banco não
define limites de permissão. Fotos são arquivos em serviço de armazenamento;
o SQL guarda identificação e metadados. Atualmente, os arquivos ficam em `storage/uploads`
no volume Docker `media_data`, com provedor SQL `LOCAL`. Não armazenar imagens em BLOB.

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
As migrações posteriores também acrescentam campos de CEP/localização e situação
de lar temporário a `ocorrencias`, sem criar novas tabelas.
O desenho enviado representa localização como 1:1, mas o SQL original não impõe
unicidade em `id_localizacao`. Na revisão, muitos registros compartilham um bairro,
e cada ocorrência mantém sua própria referência aproximada.

## Todas as tabelas e suas responsabilidades

| Grupo | Tabelas | Responsabilidade |
| --- | --- | --- |
| Contas compartilhadas | `usuarios`, `permissoes_usuarios`, `sessoes`, `recuperacoes_senha` | Cadastro, permissões administrativas por módulo, sessões revogáveis e recuperação. |
| Catálogos | `bairros`, `especies`, `racas`, `cores` | Bairros confirmados por CEP e opções controladas de espécie, raça e cor. |
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
| Ocorrência → foto | 1:0..5 no SQL e na API; o cadastro e a aprovação atuais não exigem uma foto. |
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
`excluido_em` estiver preenchido. A lista pública atual filtra também por caso aberto;
não há endpoint ou tela pública de histórico para casos resolvidos nesta versão.
Não implementar rascunhos públicos.

Criador e ficha vinculada não podem ser trocados por UPDATE. A edição altera os
campos da ficha e da ocorrência, não a autoria. Ocorrência encerrada não recebe
novas conversas. Conversas existentes podem continuar até serem encerradas, se a
ocorrência permanecer aprovada; ocultação/exclusão bloqueia novos envios.

## Votorantim e localização aproximada

1. Município fixo: Votorantim/SP, código IBGE **3557006**.
2. O formulário recebe um CEP de oito dígitos; não envia `id_bairro` nem coordenadas.
3. O backend valida município e UF pelo ViaCEP e geocodifica o bairro com Nominatim,
   BrasilAPI como alternativa e, quando necessário, a via pública retornada pelo CEP.
   O ponto precisa estar dentro dos limites aproximados do município e é arredondado
   para uma grade regional de 0,01 grau. O bairro é inserido/atualizado no catálogo
   pelo servidor; se a região não puder ser confirmada, a API rejeita o cadastro.
4. Referência opcional: praça, escola, parque ou estabelecimento público próximo.
   Orientar o usuário a não informar número residencial nem contato pessoal.
5. A administração revisa textos e fotos antes de publicar. O código atual valida o
   formato das imagens, mas não remove metadados EXIF/GPS; não tratar essa remoção
   como funcionalidade existente.
6. A API grava CEP, bairro, coordenadas aproximadas e precisão em `ocorrencias`;
   o nome da via não é gravado pelo cadastro atual. O mapa usa o ponto regional
   calculado no servidor, não coordenadas fornecidas pelo navegador. Registros
   antigos podem manter coordenadas nulas ou valores anteriores.

`DEFAULT 'Votorantim'` sozinho não restringe nada. Aqui, CHECK fixa município/UF/IBGE
e a FK vincula cada ocorrência ao catálogo. Isso não prova que o nome do bairro ou
suas coordenadas são verdadeiros: a curadoria do catálogo continua necessária.
O CHECK de latitude/longitude valida faixa e preenchimento conjunto, não o limite
geográfico municipal. Não basta arredondar uma coordenada residencial.

**ViaCEP e a geocodificação são necessárias no cadastro atual.** O backend consulta
um CEP com oito dígitos e valida retorno `erro`, `ibge == '3557006'` e `uf == 'SP'`.
Usa o bairro retornado para obter coordenadas aproximadas; Nominatim é tentado antes
da BrasilAPI CEP v2, e o nome da via pública pode ser usado como último recurso.
Se os serviços não confirmarem a região, o cadastro falha com erro explícito. O CEP
validado e as coordenadas aproximadas são armazenados; logradouro, complemento e
número residencial não são persistidos pelo fluxo atual.

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

O endpoint atual de remoção de foto tenta apagar o arquivo local depois de remover
seu registro; se o arquivo já estiver indisponível, registra um aviso. A exclusão
lógica da ocorrência não apaga imediatamente suas fotos. Uploads são privados;
somente fotos de ocorrências aprovadas, abertas e não excluídas são públicas. A API
permite até cinco imagens JPEG/PNG/WebP de 5 MB cada, mas não exige foto para criar
ou aprovar uma ocorrência e não remove metadados EXIF/GPS. A cota e a validação do
tipo real são regras da aplicação, não do SQL. Um provedor externo para produção
precisará de fluxo próprio de remoção, falhas e repetição.

## Responsabilidades que o SQL não substitui

- Autenticação, cookies seguros, hash de senha e validação de tokens.
- Autorização por usuário/módulo, inclusive leitura de mensagens e notificações.
- Validação de usuário ativo e sessão não expirada/revogada em toda operação privada.
- Transações que gravam histórico junto com alterações e controle de concorrência
  com bloqueio da linha de ocorrência/conversa quando necessário.
- Validação de data de evento não futura, catálogos de espécie/raça/cor e CEP/região.
- As listagens administrativas usam paginação por deslocamento; as demais podem ter limites fixos. Não há paginação por cursor.
- Proteção contra spam, consultas parametrizadas e limites de requisições.
- Seleção explícita de campos públicos e teste de acessos indevidos.

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
