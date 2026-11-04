# Backups do ambiente local

## Criar um backup completo

Na raiz do repositório, com o Docker Desktop aberto e os contêineres em execução:

```powershell
node database/scripts/backup-local.mjs
```

O script gera uma pasta nova em `backups/resgate-DATA`, com um dump `resgate_animais.sql`, a pasta `storage` de fotografias do volume `media_data`, e um aviso de segurança. O arquivo `.gitignore` impede o envio automático desses backups ao GitHub.

Os dados copiados podem conter **nome, e-mail, telefone, mensagens privadas e fotos**. Guarde em local protegido, use criptografia quando transportar, restrinja o acesso e elimine cópias desnecessárias. Não use repositórios Git para compartilhar o backup.

## Restaurar sem apagar o ambiente existente

**Não restaure por cima do banco da faculdade nem rode `docker compose down -v`.** Restaurar em ambiente descartável primeiro é obrigatório para verificar a integridade.

1. Crie um segundo ambiente Docker com **outro nome de projeto, outras portas e novos volumes**.
2. Confira a versão do MySQL (8.4), o esquema criado e o conteúdo do arquivo SQL.
3. Na base de teste vazia, importe o arquivo com o cliente MySQL 8.4 usando a conta administrativa local desse ambiente e revise os erros.
4. Copie as imagens da pasta `storage` para o volume equivalente desse novo ambiente, preservando nomes dos arquivos.
5. Valide as tabelas, o histórico de migrações, o acesso por duas contas e as fotos no navegador.
6. Somente depois de confirmar a restauração em um ambiente isolado, planeje uma eventual troca do ambiente original, com aprovação e backup anterior.

Não incluí um comando automático de restauração destrutiva: ele poderia apagar dados existentes ou causar mistura de chaves entre os computadores. O objetivo é permitir backups verificáveis sem alterar o banco em uso.

## Limitações

O script depende de Docker Compose, `mysqldump` no contêiner MySQL, `docker compose cp` e permissões para escrever na pasta `backups`. Ele ainda precisa ser testado em Windows e Ubuntu. Para hospedagem real, definir armazenamento externo cifrado, agendamento, retenção e testes periódicos de recuperação.
