# Backup e restauração segura — ambiente local

Os dados de demonstração ficam no MySQL do volume `mysql_data` e as imagens no volume `media_data`. **Git/GitHub não sincronizam esses volumes.**

## Gerar backup

Com Docker Compose e MySQL/web iniciados, na raiz:

```bash
node backend/database/scripts/backup-local.mjs
```

O script cria `backups/resgate-DATA/` com `resgate_animais.sql`, uma cópia do diretório `storage` e instruções. Não sobrescreve backups anteriores e não altera os dados existentes. A pasta `backups/` está no `.gitignore`.

Os arquivos podem conter **dados pessoais e mensagens privadas**. Armazene em mídia segura, com acesso limitado e, se necessário, criptografia. Não envie o dump para GitHub, Jira ou Teams.

## Testar uma restauração sem mexer no banco atual

```bash
node backend/database/scripts/verificar-restauracao.mjs backups/resgate-DATA
```

Substitua o diretório pelo nome real gerado. O verificador:

1. Recusa caminhos fora da pasta local `backups/`.
2. Inicializa um **MySQL 8.4 descartável**, sem publicar portas e sem montar os volumes do projeto.
3. Importa o dump, confere migrações e contagens básicas de contas/ocorrências/fotos.
4. Destrói somente o contêiner de verificação, mesmo se ocorrer um erro.

O teste comprova que o dump pode ser lido e que o esquema principal foi recuperado. **Não comprova automaticamente cada foto** nem garante a restauração integral da interface: para entrega final, verifique também os arquivos em `storage/uploads` e abra alguns cartazes em ambiente separado.

## Recuperação efetiva

Não restaure sobre o banco usado pela equipe sem autorização e novo backup. Para transferir a base para outro computador, prepare outro Compose isolado (nome do projeto, portas e volumes próprios), importe o dump nesse ambiente, copie as fotos para o volume correto, aplique a versão compatível do app e execute o roteiro manual com dois cidadãos e ADM.

**Nunca execute `docker compose down -v` para 'corrigir' um banco com informações.** O comando destrói volumes. Não há rotina automática destrutiva de restore neste repositório.

## Produção

Backups locais não representam plano de recuperação em produção. Para publicar: backup externo criptografado, rotina automatizada, retenção, monitoramento de falhas e testes periódicos de restauração em ambiente isolado.
