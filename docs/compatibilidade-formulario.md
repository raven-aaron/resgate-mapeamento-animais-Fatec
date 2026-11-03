# Adaptação do PI do primeiro semestre

Referências no repositório `raven-aaron/Projeto-Resgate-e-Mapeamento-FATEC`:

- `ProjetoHtmlCss/cartaz-PET-perdido-USER.html` e `cartaz-PET-encontrado-USER.html`: serviram de base para o cartaz público e para a prévia do ADM. Os HTMLs antigos mostravam contatos por telefone/e-mail; a nova versão substitui isso por chat privado.
- `ProjetoHtmlCss/mapa-interativo.html`: mapa de animais (pins individuais, foto e acesso ao cartaz), não mapa de seleção de CEP.
- `ProjetoHtmlCss/registro-USER.html`: nome completo, telefone, e-mail, senha e confirmação de senha. Telefone privado.
- `ProjetoHtmlCss/login-USER.html`, `recuperar-Senha.html`: entrada em conta e formulário de recuperação.
- `ProjetoHtmlCss/adm/solicitacoes-ADM.html`: fila de análise com prévia do cartaz, aprovar ou negar.
- `ProjetoHtmlCss/adm/animais-cadastrados-ADM.html`: gestão das ocorrências registradas.
- `ProjetoHtmlCss/adm/menuADM.html`, `painel-estatisticas-ADM.html` e `mapa-calor-ADM.html`: navegação e análises.

## Formulário atual

- Espécies: **Cachorro** e **Gato**; raça canina da lista original; campo desabilitado para gatos.
- Campos: nome, espécie, idade, microchip, sexo, porte, cor/pelagem, raça, data, CEP e referência, fotos e observações.
- **Nunca oferecer opção com texto “Não sei”**; campos não conhecidos podem ser deixados sem preencher quando a regra permitir.
- CEP validado para Votorantim, mapa de seleção da região aproximada **dentro do formulário**, sem número da residência.
- Fotos: até cinco; guardadas no volume persistente privado com rota de acesso autorizada.
- Fluxo: login obrigatório → revisar cadastro → enviar para análise → MySQL status `PENDENTE` → moderação ADM → publicação no mapa/cards.
- Contato: interessados precisam estar logados; telefone/e-mail nunca são exibidos em cartazes públicos.

## Identidade visual

Manter **Outfit**, verde-água `#348888`, ciano `#9EF8EE` e laranja `#FA7F08`. O projeto ainda usa CSS global e CSS Modules; Tailwind não foi instalado nesta etapa.

A navegação pública da Prefeitura é separada do menu de resgate. O ADM possui acesso próprio, protegido por permissão `RESGATE/ADMIN`.
