# Chatbot WhatsApp — versão pública sanitizada

Esta pasta contém a versão pública do código experimental do chatbot para WhatsApp Web.

## Importante

Contatos reais, links operacionais, canais internos e informações sensíveis foram removidos ou substituídos por :

Fulana@jtexpress.com.br
(99) 99999-9999

## Objetivo do arquivo

O arquivo `robo-publico.js` demonstra a lógica do chatbot:

- conexão com WhatsApp Web;
- geração de QR Code;
- menu de cliente novo;
- menu de cliente já cadastrado;
- respostas automáticas;
- registro de interações;
- geração de dados para análise e dashboard;
- tratamento básico de LGPD com telefone ofuscado.

## Como rodar experimentalmente

```bash
npm install
npm start
```

A integração com WhatsApp Web pode apresentar instabilidade por depender do WhatsApp Web e da biblioteca utilizada. Para avaliação funcional, utilize o protótipo web na raiz do projeto.
