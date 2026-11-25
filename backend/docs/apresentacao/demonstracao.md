# Demonstração do projeto

Este roteiro organiza uma apresentação simples do Resgate e Mapeamento de Animais. Para instalar o sistema, siga o [README](../../../README.md). A lista completa do que precisa ser testado está no [roteiro de validação](validacao.md).

## Antes de apresentar

1. Inicie o MySQL, aplique as migrações e abra o site conforme o README.
2. Separe um navegador para o cidadão, outro para o administrador e, se possível, uma terceira sessão para testar o chat.
3. Use dados de teste no ambiente local ou DEMO, nunca no banco com ocorrências reais.
4. Confira o acesso a `/mapa`, `/animais`, `/api-docs` e `/admin/login`.

## Sequência sugerida

1. **Visitante:** abra o mapa e os cartazes. Explique que só aparecem ocorrências aprovadas.
2. **Cidadão:** crie uma conta e cadastre um animal perdido ou encontrado, com CEP e foto.
3. **Administrador:** entre na área administrativa, abra a ocorrência pendente e aprove.
4. **Visitante:** atualize o mapa e abra o cartaz publicado.
5. **Outro cidadão:** entre em contato pelo chat, envie uma mensagem e confira a resposta.
6. **Autor:** edite a ocorrência e mostre que ela precisa ser aprovada novamente.
7. **Administrador:** aprove a edição e confira as estatísticas.
8. **Autor:** encerre a ocorrência; ela deve deixar de aparecer na consulta pública.

Para mostrar a API, abra `/api-docs` e apresente os métodos GET, POST, PUT e DELETE. A proteção das rotas usa sessões com cookies e conferência de permissões no servidor. O banco utilizado é o MySQL.

## Cuidados

- Não mostre senhas, arquivos `.env` nem dados pessoais reais.
- Não apague volumes Docker com dados.
- A recuperação de senha por e-mail depende de configuração externa.
- Os testes do GitHub não substituem a conferência das telas no navegador.
- A hospedagem pública será a última etapa, depois da revisão da aplicação.
