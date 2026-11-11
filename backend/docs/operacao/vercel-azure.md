# Publicação do Resgate — Vercel e Azure (configuração necessária)

Este repositório mantém as APIs Next.js e o esquema **MySQL**. O deploy de outra equipe não configura este repositório automaticamente.

1. O banco Azure deve ser **Azure Database for MySQL**, não Azure SQL Database (SQL Server). Configure na Vercel as variáveis `DB_HOST`, `DB_PORT=3306`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` e `DB_SSL=required`. O servidor MySQL deve aceitar conexões de saída da implantação e usar TLS.
2. Aplique as migrações SQL `001` a `005` **antes** de iniciar o sistema hospedado. O migrador atual usa Docker local e não é um migrador remoto de produção. Execute migrações separadamente com backup e credenciais adequadas; não execute seeds fictícios em produção.
3. Para upload de fotos, crie no Azure Storage uma conta e um contêiner **privado** de Blob Storage. Configure as variáveis de servidor `AZURE_BLOB_CONTAINER_URL=https://<conta>.blob.core.windows.net/<container>` e `AZURE_BLOB_SAS_TOKEN` com SAS de contêiner limitado (leitura, criação, escrita e exclusão), gerado e protegido pela equipe responsável. Não coloque o token em variáveis `NEXT_PUBLIC_` ou no GitHub.
4. O navegador envia primeiramente a ocorrência ao servidor e depois as fotos **uma por vez**, limitadas a 4 MB. Isso evita ultrapassar o limite de 4,5 MB de requisição na Vercel. As fotos permanecem privadas no Blob; a API `/api/fotos/[arquivo]` controla a leitura conforme a permissão da ocorrência.
5. Configure o projeto Vercel com o diretório-raiz `frontend` e Node.js compatível. Use HTTPS, verifique logs e não publique credenciais.
6. Teste com dois usuários reais de teste: conta, login, cadastro de animal perdido e encontrado, upload, aprovação por admin, visualização no mapa, criação de conversa, troca de mensagens, notificação e histórico após novo login.

**Atenção:** o chat já salva mensagens no MySQL e consulta periodicamente; não exige serviço de WebSocket. A infraestrutura externa e as credenciais de Azure/Vercel precisam ser provisionadas pela equipe antes da publicação.
