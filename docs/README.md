# Documentação

Consulte o guia correspondente à tarefa.

| Área | Arquivo | Conteúdo |
| --- | --- | --- |
| Arquitetura | [Visão geral](arquitetura/visao-geral.md) | Fluxo da requisição, responsabilidades e autenticação |
| Arquitetura | [Modelo de dados](arquitetura/modelo-dados.md) | Entidades, relacionamentos e regras de negócio |
| Arquitetura | [Dicionário de dados](arquitetura/dicionario-dados.md) | Campos e estrutura do MySQL |
| Arquitetura | [Integração entre módulos](arquitetura/integracao.md) | Contratos entre frentes de trabalho |
| Front-end | [Guia da equipe](frontend/guia-equipe.md) | Onde editar, como validar e limites do escopo |
| Front-end | [Identidade visual](frontend/identidade-visual.md) | Referências do PI original |
| Operação | [Docker](operacao/docker.md) | Instalação e execução |
| Operação | [Dados de demonstração](operacao/dados-demonstracao.md) | Seed, imagens e Insomnia |
| Operação | [Backup](operacao/backup.md) | Cópia e restauração local |
| Operação | [Versões](operacao/versoes.md) | Node, Next e ferramentas |
| Apresentação | [Demonstração](apresentacao/demonstracao.md) | Roteiro de apresentação |
| Apresentação | [Validação](apresentacao/validacao.md) | Testes manuais e critérios de aceite |
| Referências | [Formulário original](referencias/formulario-original.md) | Decisões de migração do PI anterior |

A implementação atual é a fonte de verdade: `database/migrations/` para o banco e `web/src/app/api/` para os contratos HTTP. Documentos de referência podem conter decisões históricas.
