# Roteiro de testes do sistema

Este roteiro serve para conferir o funcionamento do Resgate e Mapeamento de Animais antes da entrega do PI. Os testes automáticos ficam no GitHub Actions; os passos abaixo precisam ser feitos no navegador com o sistema e o MySQL funcionando.

## Preparação

1. Instale e execute o projeto seguindo o [README principal](../../../README.md).
2. Confira se o MySQL está saudável e se o site abre em `http://localhost:3000`.
3. Prepare três contas de teste: um cidadão que cadastra, outro que entra em contato e um administrador do módulo Resgate. Use sessões ou navegadores separados.
4. Use dados e fotos de teste apenas no ambiente local ou DEMO. Não altere um banco que tenha registros reais.

## Fluxos que precisam funcionar

| Teste | Resultado esperado |
| --- | --- |
| Cadastro e login de cidadão | Conta criada; o usuário entra e consegue sair |
| Cadastro de animal perdido | CEP validado; ocorrência gravada como pendente |
| Cadastro de animal encontrado | Opção de acolhimento temporário é salva corretamente |
| Fotos | Envio, visualização e remoção respeitam os limites e as permissões |
| Moderação | Administrador aprova ou rejeita; rejeição exige justificativa |
| Consulta pública | Só aparecem ocorrências aprovadas e abertas, no mapa e nos cartazes |
| Filtros | Espécie, tipo, porte, sexo, bairro e busca funcionam nas telas correspondentes |
| Chat | Segundo cidadão inicia conversa; mensagens aparecem nas duas contas |
| Notificações | Mensagens e decisões da moderação geram os avisos previstos |
| Edição | Autor altera dados ou CEP; ocorrência volta para análise |
| Encerramento e exclusão | Ocorrência deixa de aparecer na consulta pública |
| Área administrativa | Usuário comum não acessa páginas nem operações restritas |
| Documentação da API | `/api-docs` abre o Swagger; `/openapi.json` apresenta as rotas |
| API REST | GET, POST, PUT e DELETE respondem conforme documentação e permissões |

## Testes de segurança

- Usuário B não pode editar, excluir ou ver fotos privadas da ocorrência de A.
- Visitante não pode ver conversas nem ocorrências pendentes.
- Cidadão sem permissão não pode aprovar cadastros nem administrar usuários.
- Requisições de escrita de outra origem devem ser rejeitadas.
- CEP inválido ou fora da região aceita não pode gerar localização fictícia.
- Uma ocorrência encerrada não aceita novas mensagens.

## Conferência visual

Verifique a Home, cadastro, cartazes, mapa, chat e área administrativa em celular (375 px), tablet (768 px) e computador (1280 px). Confira cores dos botões, menus, textos cortados, rolagem horizontal, campos obrigatórios e navegação por teclado.

## Testes automáticos

No diretório `frontend/`, execute:

```bash
npm ci
npm run test:jest
npm run test:regras
npm run test:origem
npm run test:fotos
npm run test:openapi
npm run lint
npx next typegen
npx tsc --noEmit
npm run build
```

Os workflows do GitHub também testam MySQL, migrações, integração HTTP e dados de demonstração, em ambientes isolados. Não execute o seed DEMO em banco com dados reais.

## Antes de concluir

Marque cada fluxo manual somente depois de testá-lo. Se houver falha, registre a tela, o caminho para reproduzir e a mensagem de erro. A hospedagem e as URLs públicas serão tratadas após a validação local, conforme o planejamento da equipe.
