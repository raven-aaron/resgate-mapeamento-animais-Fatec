# Banco de dados — MySQL

O MySQL de desenvolvimento utiliza a imagem `mysql:8.4.13`, definida no `compose.yaml` da raiz.

A base `resgate_animais` é criada vazia no primeiro início. **As tabelas ainda não foram implementadas**: o grupo responsável pelo banco deve versionar os scripts SQL em `database/migrations/` e definir a ordem de aplicação junto com o restante da equipe.

Evitem colocar scripts de schema provisórios na inicialização automática do contêiner. Scripts em `/docker-entrypoint-initdb.d` só são executados quando o volume MySQL ainda está vazio; alterações futuras devem ser tratadas com migrações versionadas.

Não comitar dados reais de pessoas, fotos ou credenciais. Usar dados fictícios em `database/seeds/` quando o modelo estiver definido.
