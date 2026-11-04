# Demonstração do PI — Resgate e Mapeamento de Animais

## Referência para demonstração em 11/11/2026

Confira também [o roteiro de validação ponta a ponta](./roteiro-validacao-11-11.md), incluindo edição, exclusão lógica e encerramento pelo autor.

## Ambiente local

1. Abra a pasta do repositório e mantenha a branch `feat/banco-resgate-modulos`.
2. Execute `git pull origin feat/banco-resgate-modulos`.
3. Com o Docker Desktop em execução e `.env` configurado, execute `docker compose up -d mysql` e confirme que está **healthy**.
4. Execute `node database/scripts/migrar.mjs` para aplicar somente as migrações pendentes.
5. Execute `docker compose up -d --build web`.
6. **Ao atualizar dependências do projeto**, o volume `web_node_modules` existente precisa receber os novos pacotes: `docker compose run --rm --no-deps web npm ci`.
7. Execute `docker compose restart web` e `docker compose ps`. Confira `docker compose logs --tail=40 web` (Next.js **Ready**).

**Não execute `docker compose down -v`: isso apagaria o volume do MySQL.**

## Conta administrativa

Execute `docker compose exec web node scripts/criar-admin.mjs` e informe nome, e-mail e senha pelo terminal interativo. O programa armazena hash scrypt e concede a permissão `RESGATE/ADMIN` somente à conta escolhida. Não há senha padrão.

Acesse `http://localhost:3000/admin/login`.

## Roteiro da apresentação em duas janelas/usuários

1. **Visitante:** abra `/mapa`. Veja o mapa interativo de animais e o modo Cards. Apenas ocorrências aprovadas e abertas são mostradas.
2. **Cidadão:** acesse `/cadastro`, registre nome, telefone com DDD, e-mail e senha (com confirmação). O telefone é privado e não aparece em cartazes.
3. **Cidadão:** acesse `/ocorrencias/nova?tipo=PERDIDO` (ou `ENCONTRADO`), preencha dados, selecione fotos, consulte o CEP de Votorantim e confira o bairro identificado automaticamente; o sistema define a posição pública aproximada sem permitir mover o marcador. Revise os dados, concorde com as orientações de privacidade e envie. O cadastro entra em estado **PENDENTE**.
4. **Prefeitura (janela privativa):** faça login em `/admin/login`. Abra `/admin/solicitacoes`; a fila verifica novas solicitações automaticamente. Clique em **Saiba mais · Ver cartaz** para abrir a visualização completa da ocorrência antes da aprovação.
5. **Prefeitura:** aprove a ocorrência. A ação atualiza o MySQL e registra histórico. Em caso de rejeição, informe motivo.
6. **Visitante:** em `/mapa`, o novo animal aparece depois da atualização periódica. O pin abre um resumo com a fotografia principal, e **Ver cartaz completo** apresenta todos os dados disponíveis. A alternativa **Cards** apresenta os mesmos registros com filtros de espécie, porte, sexo e perdido/encontrado.
7. **Interessado (uma conta distinta da do autor):** abra o cartaz e clique em **Entrar em contato pelo chat**. Se não estiver autenticado, o sistema direciona ao login. A conversa é criada somente entre o interessado e o autor da ocorrência, sem divulgar e-mails e telefones.
8. **Cidadão/Interessado:** entre em `/mensagens` para ver a caixa de entrada ou `/mensagens/{id}` para conversar. As mensagens são consultadas automaticamente a cada cinco segundos. Um usuário alheio não pode ler a conversa.
9. **Prefeitura:** confira `/admin/estatisticas`, `/admin/mapa-termico` e `/admin/ocorrencias`. O mapa administrativo mostra zonas agregadas de densidade; o painel e ranking usam dados do MySQL. Ao ocultar um registro, ele deixa de aparecer publicamente.

## Hospedagem e múltiplos computadores

O Docker local utiliza `WEB_BIND_HOST=127.0.0.1` por padrão. Se os dois computadores estiverem na **mesma rede Wi-Fi de demonstração**, é possível configurar `WEB_BIND_HOST=0.0.0.0` no `.env` e recriar o serviço `web`. Acessar pelo IP LAN da máquina principal e liberar somente a porta 3000 no firewall da rede necessária. **Isso não constitui hospedagem pública nem deve ser usado para publicar o servidor de desenvolvimento na internet.**

Para hospedagem pública, serão necessários um serviço persistente de MySQL, storage persistente de imagens, gestão de segredos, HTTPS, testes de segurança e implantação do Next.js. O banco instalado apenas na máquina Ubuntu não ficará acessível em um host remoto automaticamente.

Fotos novas são armazenadas no volume Docker `media_data`, em `/app/storage/uploads`. A rota `/api/fotos/{arquivo}` restringe fotos pendentes ao autor e ao ADM. Não são salvas no repositório nem em `public/uploads` na implementação atual.

## Recuperação de senha

As rotas `/recuperar-senha` e `/redefinir-senha` usam token de uso único (SHA-256 no MySQL, expiração de 30 minutos, invalidação de sessões após redefinir). O envio por e-mail **só funciona** após configurar `RESEND_API_KEY`, `MAIL_FROM` (remetente verificado) e `APP_PUBLIC_URL`. Sem isso, a API informa que o serviço não está configurado. Não inserir credenciais no GitHub.

## Estado e limitações

- Funcionalidades implementadas no código: login cidadão/ADM, criação de conta, envio de ocorrência pendente com fotos, moderação, prévia de cartaz pendente, consulta pública mapa/cards, cartaz completo, chat privado e indicadores.
- A CI valida migrações, lint, TypeScript e build. **O funcionamento ponta a ponta em navegador + Docker + dois usuários deve ser verificado manualmente**, não presumido a partir da CI.
- Implementado na branch: edição de dados pelo autor (volta para moderação), encerramento/resolução com motivo, exclusão lógica e registro de histórico. **É obrigatório validar esses fluxos no navegador com dois usuários e um ADM; CI isolada não prova o fluxo ponta a ponta.**
- Implementados na branch (validar no navegador): notificações no aplicativo, marcação de mensagens lidas, edição de fotos, correção de CEP com nova moderação, motivo de rejeição ao cidadão, busca por bairro/nome/data, lista de contas administrativa somente para consulta e melhorias de acessibilidade.
- Pendente: alterações globais de status/permissões de contas (dependem de autorização central), recuperação de senha sem provedor de e-mail, integração do Banco de Ração, hospedagem pública segura e testes automatizados de ponta a ponta.
- A localização dos **novos** cadastros é definida no backend: CEP validado por ViaCEP, bairro e posição regional (aproximadamente 1 km de generalização) obtida via Nominatim ou BrasilAPI CEP v2; o visitante não escolhe coordenadas. CEPs sem localização verificável são recusados, não posicionados em qualquer ponto. Isso evita desvios arbitrários, mas **não comprova a veracidade do CEP informado**: a moderação continua necessária.
- Ocorrências criadas em versões antigas mantêm suas coordenadas anteriores; não há reescrita destrutiva automática do histórico.
- Posicionamento geográfico ainda usa limites provisórios, não o polígono oficial de Votorantim. ViaCEP, Nominatim, BrasilAPI e os tiles do OpenStreetMap dependem de internet. A biblioteca Leaflet (JS/CSS) agora é empacotada localmente, sem depender do CDN unpkg.
- O mapa público atualiza apenas as ocorrências que mudaram, em intervalos de cerca de 20 segundos, e oferece **Atualizar resultados**. Popups de animais não devem mais desaparecer periodicamente sem mudanças.
- A área administrativa não tem permissão implícita para outros módulos (ex.: Banco de Ração).
