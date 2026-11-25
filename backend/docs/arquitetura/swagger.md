# Documentação da API (Swagger)

A API do sistema está documentada com **OpenAPI 3.0.3**. O arquivo com as rotas é [`frontend/public/openapi.json`](../../../frontend/public/openapi.json), e o Swagger permite consultá-las pelo navegador.

## Como acessar

Com a aplicação ligada, abra:

- **Swagger:** `http://localhost:3000/api-docs`
- **Arquivo OpenAPI:** `http://localhost:3000/openapi.json`
- **Ambiente DEMO:** `http://localhost:3001/api-docs`

Na página do Swagger, escolha uma rota para consultar o método HTTP, os campos recebidos e as respostas possíveis.

## Autenticação

As rotas públicas podem ser consultadas sem login. Para testar uma rota protegida, entre primeiro na aplicação pelo mesmo endereço e porta do Swagger:

- Cidadão: login normal do site.
- Administrador: `/admin/login`.

O sistema usa sessões no MySQL e cookies `HttpOnly`. Não é necessário copiar o token para o Swagger. As requisições que alteram dados também verificam a origem.

O botão **Try it out** fica disponível apenas em `localhost` ou `127.0.0.1`. Um POST, PUT, PATCH ou DELETE pode modificar registros; prefira testar no ambiente DEMO.

## Alguns detalhes das rotas

- Cadastro de ocorrência: usa `multipart/form-data`, com o campo `dados` contendo JSON em texto, `confirmacao_privacidade=confirmado` e até cinco fotos.
- Edição: coloca a ocorrência novamente em análise.
- Fotos ainda não publicadas: acessíveis somente pelo responsável e pelo administrador.
- A listagem administrativa de usuários é carregada pela página no servidor; não existe `GET /api/admin/usuarios`.
- Chat: as mensagens ficam no MySQL e são atualizadas por consultas à API. Não utiliza WebSocket.
- Recuperação de senha: o envio de e-mail depende da configuração do serviço externo.

Os arquivos do Swagger UI são carregados da CDN `unpkg.com`, portanto a interface precisa de internet. O arquivo `/openapi.json` continua disponível sem depender dessa CDN.

## Como conferir a documentação

Dentro da pasta `frontend/`:

```bash
npm run test:openapi
```

Esse comando compara os métodos e caminhos do OpenAPI com as rotas `route.ts` da aplicação. A verificação também roda no GitHub Actions. **O teste não confirma sozinho se cada regra de negócio está correta**; para isso, usamos os testes de integração e o [roteiro de testes manuais](../apresentacao/validacao.md).

Veja também a [lista de rotas HTTP](api-http.md) e o [README principal](../../../README.md).
