# Chatbot de Atendimento e Dashboard de Indicadores para a J&T Express

Projeto desenvolvido para o Projeto Integrador II — Grupo 31.

## Objetivo

O objetivo do projeto é propor uma solução de apoio ao atendimento da J&T Express, considerando que vendedores internos passaram a atuar de forma externa. Com isso, foi identificada a necessidade de responder dúvidas frequentes dos clientes de forma mais organizada, rápida e disponível.

A proposta principal é um chatbot para atendimento via WhatsApp, com registro das perguntas frequentes e geração de indicadores para análise.

## Demonstração funcional

Para fins acadêmicos, foi desenvolvido um protótipo web funcional em HTML, CSS e JavaScript.

Para executar:

1. Abra o arquivo `index.html` em qualquer navegador.
2. Digite `Oi`.
3. Escolha `1` para cliente novo ou `2` para cliente J&T.
4. Navegue pelas opções do atendimento.
5. Observe o dashboard atualizando os indicadores.

## Dashboard

O dashboard apresenta indicadores como:

- Total de mensagens;
- Respostas automáticas;
- Encaminhamentos;
- Categorias mais acessadas;
- Histórico das últimas interações.

## Código do WhatsApp

A pasta `whatsapp-bot` contém uma versão pública e sanitizada do código experimental do chatbot para WhatsApp Web.

Por se tratar de um repositório público, contatos reais, links operacionais, canais internos e dados sensíveis foram removidos ou substituídos por marcadores como `[CONTATO REMOVIDO]`.

A integração com WhatsApp Web é experimental, pois depende de QR Code, sessão ativa, estabilidade do WhatsApp Web e da biblioteca utilizada.

## LGPD e segurança

Os dados utilizados no projeto são simulados e/ou anonimizados. Nenhum dado pessoal real de clientes deve ser publicado no repositório.

Também foram ignorados arquivos de sessão, cache, dependências instaladas e registros de atendimento por segurança e boas práticas.

## Estrutura

```text
PROJETOJTEXPRESS/
├── Chat-Bot-Web/
    ├── index.html
    ├── style.css
    ├── script.js
    └── README.md
├── Dashboard/
    ├── atendimentos.csv
    ├── index.html
    ├── style.css
    ├── script.js
    └── README.md
└── Whatsapp-bot/
    ├── robo-publico.js
    ├── package.json
    ├── README.md
    └── .gitignore
```

## Observação para avaliação

O protótipo web é a versão funcional para demonstração. O código do WhatsApp fica disponível para análise da lógica de integração, mas sem exposição de dados internos da empresa.
