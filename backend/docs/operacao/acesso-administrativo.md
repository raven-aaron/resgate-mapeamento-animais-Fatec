# Acesso administrativo

O projeto mantém uma **única aplicação Next.js**, mas separa os acessos do cidadão e do administrador.

- **Cidadão:** `/entrar` redireciona para `/login`; o cadastro normal não concede permissões administrativas.
- **Administrador:** abrir `/admin/login` diretamente, digitando a URL completa ou usando um favorito privado. Não há link de administração na navegação pública.
- **Controle real de segurança:** as rotas administrativas exigem sessão e permissão `ADMIN` no módulo `RESGATE`. O endereço de login pode ser descoberto; escondê-lo é apenas uma escolha de interface.

## Criar o primeiro administrador

Depois de iniciar o MySQL e **aplicar as migrações**, execute o script existente no ambiente privado da aplicação.

**Docker Compose local (raiz do repositório):**

```bash
docker compose exec web node scripts/criar-admin.mjs
```

**Contêiner da aplicação no Northflank:**

1. Abra o serviço Next.js hospedado e a opção de terminal/Shell do contêiner em execução.
2. Verifique que o serviço recebeu `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER` e `DB_PASSWORD` do banco MySQL privado.
3. Execute `node scripts/criar-admin.mjs` no diretório `/app`.
4. Informe seu nome, e-mail e uma senha forte com pelo menos 10 caracteres. O script oculta a digitação da senha em terminal interativo.
5. Confira a mensagem `Administrador RESGATE configurado`. Acesse `https://<dominio-publico>/admin/login` e entre com os dados cadastrados.

Não existe senha administrativa padrão, API pública para criar administradores, ou necessidade de gravar `ADMIN_SENHA` no GitHub. O script também consegue atribuir permissão a um e-mail já cadastrado, redefinindo a senha dessa conta; use esse comportamento apenas conscientemente. Reexecutá-lo para o mesmo usuário revoga as sessões anteriores.

Se o terminal hospedado não fornecer entrada interativa, prefira uma tarefa privada de execução única com os três valores `ADMIN_NOME`, `ADMIN_EMAIL` e `ADMIN_SENHA` como **segredos temporários**, removendo-os após a execução. Nunca imprima, compartilhe ou versione a senha. Não use dados administrativos como argumentos de linha de comando.

## Teste com duas máquinas

1. Máquina A: abra `/admin/login`, autentique como administrador e acesse `/admin`.
2. Máquina B: abra `/entrar`, cadastre ou autentique uma conta comum e envie uma ocorrência.
3. Máquina B: confira que o usuário comum não acessa funções administrativas, mesmo digitando `/admin` diretamente.
4. Máquina A: avalie a solicitação, aprove ou rejeite e confirme a mudança na consulta pública da máquina B.
5. Verifique o encerramento das sessões por meio dos botões de sair.

As duas máquinas usam cookies independentes. O administrador utiliza a sessão `resgate_admin_sessao` com validade de 12 horas; o cidadão utiliza `resgate_sessao`. Usar máquinas diferentes é uma comodidade, não um requisito de autorização.

## Publicação

A criação do primeiro administrador **não deve acontecer automaticamente no build** nem a cada reinício do contêiner. Faça uma única vez, depois que o banco hospedado estiver preparado, e mantenha o comando para recuperação controlada.

Este roteiro pressupõe que o serviço já contenha o script `frontend/scripts/criar-admin.mjs` e uma conexão MySQL operacional. A implantação do banco, as migrações e a configuração de volume para fotos são tarefas anteriores e separadas.
