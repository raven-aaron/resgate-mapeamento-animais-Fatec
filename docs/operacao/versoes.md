# Versões e ambiente de desenvolvimento

Este projeto utiliza um ambiente padronizado para que todos consigam instalar, executar e integrar o mesmo código.

## Versões oficiais neste momento

| Ferramenta | Versão definida |
|---|---|
| Node.js | Linha 24.x (utilize o patch mais recente da linha 24) |
| npm | Linha 11.x |
| Next.js | 16.4.2 |
| React / React DOM | 19.3.0 |
| TypeScript | 5.9.3 |
| ESLint | 9.39.5 |
| eslint-config-next | 16.4.2 |
| MySQL | A definir com os responsáveis pelo banco antes de criar o Docker Compose |

As demais dependências e seus pacotes transitivos seguem o `web/package-lock.json`. Algumas declarações de tipos continuam com faixas de versão; o lockfile registra as versões efetivamente usadas.

## Preparando o ambiente local

1. Instale Node.js 24 e npm 11. Consulte `web/.nvmrc` e `web/package.json`.
2. Entre na pasta `web`.
3. Execute `npm ci` para reproduzir as dependências do lockfile.
4. Execute `npm run check:versions` para validar a política de versões.
5. Execute `npm run lint`, `npx next typegen`, `npx tsc --noEmit` e `npm run build` para validar o projeto.

O arquivo `web/.npmrc` recusa instalações com versões de Node/npm fora dos intervalos declarados em `engines` e define salvamento exato para novas dependências. A aplicação permanece na versão de pacote declarada e registrada no lockfile.

## Como atualizar versões

Não altere dependências principais por conta própria. Para propor uma atualização:
- crie uma branch própria e abra um Pull Request;
- atualize `web/toolchain.versions.json`, `web/package.json` e `web/package-lock.json` na mesma alteração;
- rode a pipeline de CI e valide compatibilidade;
- solicite revisão da equipe antes do merge.

O GitHub Actions executa `npm run check:versions` nos Pull Requests para `main`, antes da instalação. Isso valida a **consistência** com a política versionada; a aprovação humana e a proteção da `main` continuam necessárias para autorizar mudanças de versão.
