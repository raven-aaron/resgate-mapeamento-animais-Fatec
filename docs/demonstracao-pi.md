# Demonstração funcional do PI — Resgate e Mapeamento

## Preparação no Ubuntu

No repositório clonado, na branch \`feat/banco-resgate-modulos\`:

    git pull origin feat/banco-resgate-modulos
    node database/scripts/migrar.mjs
    docker compose up -d --build web
    docker compose ps

O MySQL deve estar saudável. O banco não deve ser descartado: não execute \`docker compose down -v\`.

A aplicação fica em http://localhost:3000.

## Criar o administrador de demonstração

Execute, no mesmo diretório:

    docker compose exec web node scripts/criar-admin.mjs

O programa solicita nome, e-mail e senha localmente. Escolha uma senha forte (10 a 128 caracteres), que não será ecoada na tela. O comando cria uma conta com permissão \`ADMIN\` **somente no módulo \`RESGATE\`**, usando hash scrypt. Não há senha embutida no GitHub.

Se a conta já existir, o programa atualiza a senha e revoga sessões anteriores. Não use uma conta de produção para apresentar o PI.

## Roteiro de teste end-to-end

1. Abra http://localhost:3000/cadastro e crie uma conta de cidadão com outro e-mail (sem acesso ADM).
2. Abra http://localhost:3000/ocorrencias/nova?tipo=PERDIDO e preencha um animal cachorro ou gato, espécie, data, CEP de Votorantim, fotos opcionais e a localização aproximada. Confirme o ponto no mapa e clique **REVISAR CADASTRO**, depois **ENVIAR PARA ANÁLISE**.
3. A ocorrência deve ser gravada no MySQL como \`PENDENTE\` e aparecer em http://localhost:3000/minhas-ocorrencias para o proprietário.
4. Em uma janela privativa (sessão separada), abra http://localhost:3000/admin/login e entre com a conta administrativa criada no terminal.
5. Acesse http://localhost:3000/admin/solicitacoes; localize o registro, abra a confirmação e clique **ACEITAR**.
6. Na janela pública, abra http://localhost:3000/mapa. O registro aprovado e aberto aparecerá no mapa com um marcador próprio. Clique no pin para ver o resumo e acesse a página completa do animal. Alterne para **Cards** e aplique filtros por espécie, porte, sexo e situação.
7. Volte ao ADM, vá em **Animais cadastrados** e teste **OCULTAR** (informando o motivo). Confirme que o animal deixa de aparecer na consulta pública.

## Rotas

- \`/resgate\`: entrada do módulo de resgate.
- \`/mapa\`: consulta pública por mapa e cards com dados reais.
- \`/ocorrencias/nova\`: cadastro do cidadão com seleção de localização aproximada.
- \`/minhas-ocorrencias\`: consulta autenticada ao próprio histórico.
- \`/cadastro\` e \`/login\`: contas normais.
- \`/admin/login\`: login exclusivo do ADM do módulo RESGATE.
- \`/admin\`: indicadores reais.
- \`/admin/solicitacoes\`: aprovação e rejeição de pendências, com motivo e histórico.
- \`/admin/ocorrencias\`: todas as ocorrências e ocultação de publicações.
- \`/admin/estatisticas\`: indicadores por espécie, situação e bairro.
- \`/admin/mapa-termico\`: **ranking territorial** real por bairro; representação geográfica de calor ainda não está implementada.

## Separação de acesso

- A senha fica armazenada somente como hash \`scrypt\`.
- A sessão usa cookie HTTP-only; o token bruto não fica no MySQL, apenas hash SHA-256.
- Criar conta em \`/cadastro\` **não concede administração**.
- Os endpoints de administração verificam a permissão \`RESGATE/ADMIN\` no servidor, e as páginas ADM também são protegidas.
- A listagem pública exibe apenas ocorrências \`APROVADO\`, \`ABERTO\` e não excluídas.
- Os pontos apresentados publicamente são arredondados a três casas decimais; não exibir local de residência.

## Limitações atuais e próximos trabalhos

- Fotos são gravadas localmente em \`web/public/uploads/\` para a demonstração no Docker; os arquivos são ignorados pelo Git e **não** são adequados como storage definitivo de produção. Migrar para armazenamento privado/controlado em nuvem ou storage local administrado antes de hospedar.
- ViaCEP, Nominatim e o mapa base OpenStreetMap dependem de serviços externos e internet.
- A restrição geográfica usa limites provisórios, não o polígono oficial do município.
- O mapa térmico ainda precisa de uma camada real de densidade sobre o mapa.
- O chat interno, edição/exclusão de ocorrências, recuperação de senha, integração do Banco de Ração, notificações e recursos complementares de acessibilidade continuam pendentes.
- A CI valida lint, TypeScript, build Next.js, Docker e migrações; para comprovar o fluxo completo, executar este roteiro manual no Ubuntu.
