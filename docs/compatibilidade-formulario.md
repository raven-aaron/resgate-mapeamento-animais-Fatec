# Compatibilidade entre formulário antigo e banco novo

A interface do módulo de resgate segue o formulário original do PI do primeiro semestre:
- Espécies disponíveis ao cidadão: **Cachorro** e **Gato**. A entrada legada **Outro** foi inativada no catálogo (migração 004), sem apagar registros.
- Campo **Raça**: lista de raças caninas do formulário original; desabilitado para gatos. A migração 004 alimenta o catálogo MySQL para cães; gatos mantêm **Sem raça definida** no banco caso seja necessário indicar raça sem conhecimento.
- Campos mantidos: nome (obrigatório para perdido e opcional para encontrado), espécie, idade, microchip, sexo, porte, cor/pelagem, raça, localização, data, fotos e observações.
- Endereço: usa CEP validado para Votorantim, referência pública e confirmação de ponto aproximado — adaptação necessária ao modelo atual com privacidade.
- Cor: campo estruturado conforme a tabela \`cores\`, com detalhes adicionais de pelagem no texto de observações.
- Fotos: pré-visualização local de até 5 imagens. Não ocorre upload nem gravação antes da implementação da API autenticada.
- A ação do formulário é **Revisar cadastro**, não "Salvar": não simular sucesso enquanto não houver persistência real no MySQL.
- Navegação geral da Prefeitura: Vacinas, Adoção, Banco de Ração, Perdi meu Pet.
- Menu lateral: apenas registrar perdido, registrar encontrado e mapa de localização.
- Busca do cabeçalho: índice local de serviços/rotas conhecidas, não busca de ocorrências em banco nem integração com motor de busca externo.

## Estilização

A versão atual usa **CSS global + CSS Modules**, como a estrutura original. **Tailwind ainda não está instalado** no \`web/package.json\`. Adicioná-lo exige \`tailwindcss\`, \`@tailwindcss/postcss\`, \`postcss\` e atualizar \`package-lock.json\` com npm para manter \`npm ci\` e Docker reproduzíveis. Não adicionar somente import ou dependências sem o lockfile, para evitar quebrar build/CI.

O modo alto contraste passa a usar variáveis de cores coerentes nos componentes e não a inverter o fundo sem corrigir o texto e o menu.
