# Swagger UI e OpenAPI — módulo Resgate

A API possui uma especificação **OpenAPI 3.0.3** versionada em [`web/public/openapi.json`](../../web/public/openapi.json), renderizada por **Swagger UI**.

## Como abrir

1. Execute o projeto localmente (porta **3000**) ou o ambiente DEMO (porta **3001**).
2. No navegador, acesse `http://localhost:3000/api-docs` ou `http://localhost:3001/api-docs`.
3. Expanda uma categoria e escolha uma operação para ver entradas, respostas, autenticação e erros.

O endereço acima redireciona para `/swagger/index.html`. Os arquivos CSS/JS do Swagger UI são obtidos da CDN `unpkg.com` (versão fixada em 5.32.0), por isso a interface depende de acesso à internet. A especificação `/openapi.json` funciona independentemente da CDN e pode ser importada no Swagger Editor, Postman, Insomnia ou outras ferramentas OpenAPI.

## Autenticação e testes interativos

- Visitantes podem consultar as rotas públicas.
- Para chamadas do **cidadão**, faça login no site, no **mesmo host/porta** do Swagger UI; o navegador enviará automaticamente o cookie HttpOnly `resgate_sessao`.
- Para chamadas **administrativas**, faça login em `/admin/login`, no mesmo host/porta; o cookie `resgate_admin_sessao` é independente.
- **Não cole o valor dos cookies** no campo Authorize: navegadores não permitem que JavaScript defina diretamente o cabeçalho Cookie. O Swagger UI usa `withCredentials=true` para aproveitar a sessão que já existe.
- O botão **Try it out** está habilitado apenas em `localhost` e `127.0.0.1`. Mesmo localmente, chamadas POST/PATCH/DELETE modificam o banco e podem enviar notificações. Prefira o ambiente DEMO, com dados fictícios.

Alterações de estado exigem requisições da mesma origem. Caso a interface e a API estejam em hosts/portas diferentes, autenticação e verificação de origem podem falhar.

## Observações sobre os contratos

- O cadastro de ocorrência usa `multipart/form-data`: `dados` é **texto JSON serializado**, `confirmacao_privacidade=confirmado` e `fotos` é um campo repetível (até 5 imagens). Não envie `dados` como objeto JSON separado do formulário.
- A edição de ocorrência devolve o status para **PENDENTE** e exige nova moderação.
- Fotos de ocorrências ainda não publicadas não são públicas; somente o autor e administrador podem acessá-las.
- O endpoint `GET /api/admin/usuarios` **não existe**: a listagem da tela administrativa é obtida no servidor da página, diretamente no banco. Somente `PATCH /api/admin/usuarios` é uma rota HTTP.
- As mensagens são persistidas no MySQL. Não existe WebSocket; o cliente consulta a API para atualizar as conversas. Não há garantia de entrega instantânea.
- A recuperação de senha por e-mail depende de `RESEND_API_KEY`, `MAIL_FROM` e `APP_PUBLIC_URL`.

## Garantia contra documentação desatualizada

Dentro de `web/`, execute:

```bash
npm run test:openapi
```

O teste compara os métodos/caminhos descritos no OpenAPI com os `route.ts` de `web/src/app/api/`, exige `operationId`, resumo, respostas e verifica referências internas. Está integrado à CI para impedir novos endpoints sem contrato. **Ele não valida automaticamente regras de negócio ou o conteúdo de cada resposta** — essas partes precisam continuar sendo conferidas com o código, testes de integração e coleção [Insomnia](../../insomnia/resgate-demo.insomnia-v4.json).

Documentação complementar: [API HTTP](api-http.md), [visão geral da arquitetura](visao-geral.md) e [dados de demonstração](../operacao/dados-demonstracao.md).
