const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");
const fs = require("fs");
const path = require("path");

// Base simples e estável para conexão com QR Code.
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  },
});

// ─── Analytics ────────────────────────────────────────────────────────────────
const ANALYTICS_DIR = path.join(__dirname, "analytics");
if (!fs.existsSync(ANALYTICS_DIR)) fs.mkdirSync(ANALYTICS_DIR, { recursive: true });

const FILES = {
  events: path.join(ANALYTICS_DIR, "eventos.json"),
  summary: path.join(ANALYTICS_DIR, "resumo.json"),
  csv: path.join(ANALYTICS_DIR, "eventos.csv"),
};

const OPTION_LABELS = {
  initial: {
    "1": "Sou cliente novo",
    "2": "Já sou cliente J&T",
  },
  new_client: {
    "1": "NC – Informações para cadastro",
    "2": "NC – Como funciona a operação",
    "3": "NC – Solicitar primeira coleta",
    "4": "NC – Regras de embalagem",
    "5": "NC – Entender o Portal VIP",
    "6": "NC – Falar com atendimento comercial",
  },
  existing_client: {
    "1": "EC – Solicitar coleta",
    "2": "EC – Acessar Portal VIP",
    "3": "EC – Abrir ou acompanhar ticket",
    "4": "EC – Pedido não localizado",
    "5": "EC – Avaria / violação / falta de itens",
    "6": "EC – Extravio",
    "7": "EC – Ressarcimento",
    "8": "EC – Financeiro ou cobrança",
    "9": "EC – Consultar prazos",
    "10": "EC – Falar com atendimento humano",
  },
};

const defaultSummary = () => ({
  totalAtendimentos: 0,
  totalMensagens: 0,
  opcoesPorPerfil: { initial: {}, new_client: {}, existing_client: {} },
  palavrasChaveUsadas: {},
  mensagensInvalidas: 0,
  atendimentosPorHora: {},
  atendimentosPorDia: {},
});

const loadSummary = () => {
  try {
    if (fs.existsSync(FILES.summary)) {
      return JSON.parse(fs.readFileSync(FILES.summary, "utf-8"));
    }
  } catch (error) {
    console.log("⚠️ Erro ao ler resumo.json. Criando novo resumo.");
  }
  return defaultSummary();
};

const saveSummary = (summary) => {
  fs.writeFileSync(FILES.summary, JSON.stringify(summary, null, 2), "utf-8");
};

const CSV_HEADER = "timestamp,data,hora,numero_hash,perfil,opcao,label,tipo\n";
if (!fs.existsSync(FILES.csv)) fs.writeFileSync(FILES.csv, CSV_HEADER, "utf-8");

const hashPhone = (from) => {
  const digits = String(from).replace(/\D/g, "");
  return "****" + digits.slice(-4);
};

const saveJsonEvent = (event) => {
  let events = [];
  try {
    if (fs.existsSync(FILES.events)) {
      events = JSON.parse(fs.readFileSync(FILES.events, "utf-8"));
      if (!Array.isArray(events)) events = [];
    }
  } catch (_) {
    events = [];
  }
  events.push(event);
  fs.writeFileSync(FILES.events, JSON.stringify(events, null, 2), "utf-8");
};

const trackEvent = (from, state, option, tipo = "opcao_menu") => {
  const summary = loadSummary();
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const hour = String(now.getHours()).padStart(2, "0");
  const ts = now.toISOString();
  const label = OPTION_LABELS[state]?.[option] ?? String(option);

  summary.totalMensagens++;
  if (tipo === "saudacao_inicial") summary.totalAtendimentos++;

  if (tipo === "opcao_menu" || tipo === "palavra_chave") {
    const perfil = summary.opcoesPorPerfil[state] ?? {};
    perfil[option] = (perfil[option] ?? 0) + 1;
    summary.opcoesPorPerfil[state] = perfil;
  }

  if (tipo === "palavra_chave") {
    summary.palavrasChaveUsadas[option] = (summary.palavrasChaveUsadas[option] ?? 0) + 1;
  }

  if (tipo === "invalida") summary.mensagensInvalidas++;

  summary.atendimentosPorHora[hour] = (summary.atendimentosPorHora[hour] ?? 0) + 1;
  summary.atendimentosPorDia[date] = (summary.atendimentosPorDia[date] ?? 0) + 1;
  saveSummary(summary);

  const event = { timestamp: ts, data: date, hora: hour, numero_hash: hashPhone(from), perfil: state, opcao: option, label, tipo };
  saveJsonEvent(event);

  const clean = (v) => String(v).replaceAll('"', "'");
  const row = `"${ts}","${date}","${hour}","${hashPhone(from)}","${clean(state)}","${clean(option)}","${clean(label)}","${clean(tipo)}"\n`;
  fs.appendFileSync(FILES.csv, row, "utf-8");
};

// ─── Utilitários ──────────────────────────────────────────────────────────────
const delay = (ms) => new Promise((res) => setTimeout(res, ms));
const typingDuration = (text) => Math.min(Math.max(text.length * 15, 400), 1500);

const sendMessage = async (msg, text) => {
  const chat = await msg.getChat();
  await chat.sendStateTyping();
  await delay(typingDuration(text));
  await client.sendMessage(msg.from, text);
};

const userState = {};

// ─── Mensagens ────────────────────────────────────────────────────────────────
const MSG_WELCOME = (name) =>
  `Olá, *${String(name).split(" ")[0]}*! 😊 Seja bem-vindo ao atendimento virtual da *J&T Express*.\n\n` +
  `Antes de começarmos, escolha uma opção:\n\n` +
  `*1* - Sou cliente novo\n` +
  `*2* - Já sou cliente J&T`;

const MSG_MENU_NEW_CLIENT =
  `Perfeito! 😊\n\n` +
  `Como você ainda é um cliente novo, escolha uma das opções abaixo:\n\n` +
  `*1* - Quero informações para cadastro\n` +
  `*2* - Quero saber como funciona a operação\n` +
  `*3* - Quero solicitar minha primeira coleta\n` +
  `*4* - Quero conhecer as regras de embalagem\n` +
  `*5* - Quero entender o Portal VIP\n` +
  `*6* - Falar com atendimento comercial\n\n` +
  `_Digite *MENU* a qualquer momento para voltar ao início._`;

const MSG_MENU_EXISTING_CLIENT =
  `Perfeito! 😊\n\n` +
  `Como você já é cliente J&T, escolha uma das opções abaixo:\n\n` +
  `*1* - Solicitar coleta\n` +
  `*2* - Acessar Portal VIP\n` +
  `*3* - Abrir ou acompanhar ticket\n` +
  `*4* - Pedido não localizado\n` +
  `*5* - Avaria, violação ou falta de itens\n` +
  `*6* - Extravio\n` +
  `*7* - Ressarcimento\n` +
  `*8* - Financeiro ou cobrança\n` +
  `*9* - Consultar prazos\n` +
  `*10* - Falar com atendimento humano\n\n` +
  `_Digite *MENU* a qualquer momento para voltar ao início._`;

const MSG_INVALID =
  `Desculpe, não entendi sua opção. 😊\n\n` +
  `Digite apenas o *número* da opção desejada ou *MENU* para voltar ao início.`;

const RESPONSES_NEW = {
  "1": `Para iniciar seu cadastro como cliente J&T, é necessário falar com o setor comercial.\n\n📩 *Contato comercial:*\nFulana\nE-mail: Fulana@jtexpress.com.br\n\n_Digite *MENU* para voltar ao início._`,
  "2": `A operação funciona assim:\n\n1️⃣ Você realiza o cadastro com o setor comercial.\n2️⃣ Após o cadastro, recebe acesso ao Portal VIP.\n3️⃣ Pelo Portal VIP, pode gerar etiquetas, acompanhar pedidos, abrir tickets e consultar relatórios.\n4️⃣ As coletas devem ser solicitadas conforme orientação da operação.\n\n_Digite *MENU* para voltar ao início._`,
  "3": `Para solicitar a sua primeira coleta, utilize o formulário abaixo:\n\n🔗 https://jtexpress.sg.feishu.cn/share/base/form/shrlgkgINInxEqiQ3hE5S3Q3btc\n\n⏰ A solicitação deve ser feita até às *16h* para que a coleta ocorra no dia seguinte.\n\n_Digite *MENU* para voltar ao início._`,
  "4": `As principais regras de embalagem são:\n\n📦 Utilizar caixa de papelão duplo resistente;\n🛡️ Usar proteção interna;\n⚠️ Solicitar aprovação prévia para itens frágeis;\n🚫 Não enviar produtos inflamáveis ou perigosos.\n\n_Digite *MENU* para voltar ao início._`,
  "5": `O *Portal VIP* é a plataforma utilizada para gerenciar a operação com a J&T.\n\n🔗 https://vip.jtjms-br.com/#/login\n\nPelo Portal VIP, é possível acompanhar pedidos, abrir tickets, gerar etiquetas e consultar relatórios.\n\n_Digite *MENU* para voltar ao início._`,
  "6": `Para falar com o atendimento comercial, entre em contato com:\n\n👩‍💼 *Fulana*\n📩 E-mail: fulana@jtexpress.com.br\n\n_Digite *MENU* para voltar ao início._`,
};

const RESPONSES_EXISTING = {
  "1": `Para solicitar coleta, utilize o formulário abaixo:\n\n🔗 https://jtexpress.sg.feishu.cn/share/base/form/shrlghS23vphs3QaQENkjjoEtBg\n\n⏰ A solicitação deve ser feita até às *16h* para coleta no dia seguinte.\n\n_Digite *MENU* para voltar ao início._`,
  "2": `Acesse o Portal VIP pelo link:\n\n🔗 https://vip.jtjms-br.com/#/login\n\nNo Portal VIP você pode acompanhar pedidos, abrir tickets, gerar etiquetas e extrair relatórios.\n\n_Digite *MENU* para voltar ao início._`,
  "3": `Para abrir ou acompanhar tickets, acesse o Portal VIP:\n\n🔗 https://vip.jtjms-br.com/#/login\n\nOs chamados devem ser abertos em *Gestão Pós-vendas > Ordem de trabalho normal*.\n\nArquivos extras podem ser enviados para: pr.tickets@jtexpress.com.br\n\n_Digite *MENU* para voltar ao início._`,
  "4": `Para pedidos não localizados ou volumes coletados sem registro no sistema, envie a solicitação para:\n\n📩 sp.buscas@jtexpress.com.br\n\nInclua romaneio completo e assinado, código do pedido ou chave da nota fiscal.\n\n_Digite *MENU* para voltar ao início._`,
  "5": `Em caso de avaria, violação ou falta de itens, reúna fotos da etiqueta, produto, embalagem e acondicionamento interno.\n\nDepois, abra um ticket pelo Portal VIP:\n🔗 https://vip.jtjms-br.com/#/login\n\n_Digite *MENU* para voltar ao início._`,
  "6": `Em caso de extravio, abra um ticket pelo Portal VIP:\n\n🔗 https://vip.jtjms-br.com/#/login\n\n⏰ A reclamação deve ser feita em até *90 dias* após a coleta.\n\nPara ressarcimento: ressarcimento.pr@jtexpress.com.br\n\n_Digite *MENU* para voltar ao início._`,
  "7": `Para solicitar ressarcimento, envie a solicitação para:\n\n📩 ressarcimento.pr@jtexpress.com.br\n\nInforme código do pedido, chave da NF, valor, destinatário, motivo e data de criação.\n\n_Digite *MENU* para voltar ao início._`,
  "8": `Para assuntos financeiros, faturamento ou cobrança:\n\n📩 contasareceber.sul@jtexpress.com.br\n📩 cobranca.sul@jtexpress.com.br\n📩 faturamento@jtexpress.com.br\n\n📞 Telefone: (99) 99999-9999\n\n_Digite *MENU* para voltar ao início._`,
  "9": `📋 *Principais prazos:*\n\n• Reclamações gerais: até *90 dias* após a coleta\n• Acareação: contestação em até *30 dias úteis*\n• Avaria após entrega: contestação em até *7 dias úteis*\n• Retorno de avaria: até *72h úteis*\n• Pedidos não localizados: contestação em até *30 dias úteis*\n• Ressarcimento: *30 a 45 dias* após validação\n\n_Digite *MENU* para voltar ao início._`,
  "10": `Para atendimento humano, escolha o canal adequado:\n\n🛒 Comercial: Fulana@jtexpress.com.br\n🎫 Tickets: pr.tickets@jtexpress.com.br\n🔍 Pedidos não localizados: sp.buscas@jtexpress.com.br\n💰 Ressarcimento: ressarcimento.pr@jtexpress.com.br\n💳 Financeiro: contasareceber.sul@jtexpress.com.br\n\n_Digite *MENU* para voltar ao início._`,
};

const KEYWORD_MAP = [
  { pattern: /cadastro|contratar|começar|comecar|tabela de valores/i, state: "new_client", option: "1" },
  { pattern: /coleta|coletar|primeira coleta|formulário|formulario/i, state: "existing_client", option: "1" },
  { pattern: /portal|vip|acesso|etiqueta|relatório|relatorio/i, state: "existing_client", option: "2" },
  { pattern: /ticket|chamado|suporte|ocorrência|ocorrencia/i, state: "existing_client", option: "3" },
  { pattern: /não localizado|nao localizado|busca|não encontrado|nao encontrado|volume não|volume nao/i, state: "existing_client", option: "4" },
  { pattern: /avaria|violação|violacao|item faltando|produto danificado/i, state: "existing_client", option: "5" },
  { pattern: /extravio|perdido|sumiu/i, state: "existing_client", option: "6" },
  { pattern: /ressarcimento|reembolso|indenização|indenizacao/i, state: "existing_client", option: "7" },
  { pattern: /financeiro|cobrança|cobranca|boleto|faturamento|pagamento/i, state: "existing_client", option: "8" },
  { pattern: /prazo|quanto tempo|sla|retorno/i, state: "existing_client", option: "9" },
  { pattern: /atendente|humano|falar com alguém|falar com alguem/i, state: "existing_client", option: "10" },
];

// ─── Conexão ──────────────────────────────────────────────────────────────────
client.on("qr", (qr) => {
  console.log("\n📲 Escaneie o QR Code abaixo com o WhatsApp:\n");
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("✅ WhatsApp conectado! Bot J&T Express ativo.");
  console.log(`📊 Analytics salvos em: ${ANALYTICS_DIR}`);
});

client.on("auth_failure", (message) => {
  console.log("❌ Falha na autenticação:", message);
});

client.on("disconnected", (reason) => {
  console.log("⚠️ WhatsApp desconectado:", reason);
});

// Evita responder duas vezes caso o WhatsApp dispare eventos duplicados.
const processedMessages = new Set();

const processIncomingMessage = async (msg) => {
  try {
    if (!msg || !msg.from) return;
    if (msg.fromMe) return;
    if (msg.from === "status@broadcast") return;
    if (msg.from.endsWith("@g.us")) return; // ignora grupos

    const messageId = msg.id?._serialized || `${msg.from}-${msg.timestamp}-${msg.body}`;
    if (processedMessages.has(messageId)) return;
    processedMessages.add(messageId);
    setTimeout(() => processedMessages.delete(messageId), 60000);

    const from = msg.from;
    const body = String(msg.body || "").trim();
    const upper = body.toUpperCase();

    console.log(`📩 Mensagem recebida de: ${from} | Texto: ${body}`);

    if (!body) return;

    // MENU sempre volta ao início.
    if (upper === "MENU" || upper === "INICIO" || upper === "INÍCIO") {
      userState[from] = "initial";
      const contact = await msg.getContact();
      const name = contact.pushname || contact.name || "cliente";
      trackEvent(from, "initial", "MENU", "comando_menu");
      await sendMessage(msg, MSG_WELCOME(name));
      return;
    }

    // Primeiro contato.
    if (!userState[from]) {
      userState[from] = "initial";
      const contact = await msg.getContact();
      const name = contact.pushname || contact.name || "cliente";
      trackEvent(from, "initial", body, "saudacao_inicial");
      await sendMessage(msg, MSG_WELCOME(name));
      return;
    }

    // Estado inicial.
    if (userState[from] === "initial") {
      if (body === "1") {
        userState[from] = "new_client";
        trackEvent(from, "initial", "1", "opcao_menu");
        await sendMessage(msg, MSG_MENU_NEW_CLIENT);
      } else if (body === "2") {
        userState[from] = "existing_client";
        trackEvent(from, "initial", "2", "opcao_menu");
        await sendMessage(msg, MSG_MENU_EXISTING_CLIENT);
      } else if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|hey|hi|hello)$/i.test(body)) {
        const contact = await msg.getContact();
        const name = contact.pushname || contact.name || "cliente";
        trackEvent(from, "initial", body, "saudacao_inicial");
        await sendMessage(msg, MSG_WELCOME(name));
      } else {
        const kw = KEYWORD_MAP.find((k) => k.pattern.test(body));
        if (kw) {
          userState[from] = kw.state;
          trackEvent(from, kw.state, kw.option, "palavra_chave");
          const response = kw.state === "new_client" ? RESPONSES_NEW[kw.option] : RESPONSES_EXISTING[kw.option];
          await sendMessage(msg, response);
        } else {
          trackEvent(from, "initial", body, "invalida");
          await sendMessage(msg, MSG_INVALID);
        }
      }
      return;
    }

    // Cliente novo.
    if (userState[from] === "new_client") {
      if (RESPONSES_NEW[body]) {
        trackEvent(from, "new_client", body, "opcao_menu");
        await sendMessage(msg, RESPONSES_NEW[body]);
      } else {
        const kw = KEYWORD_MAP.find((k) => k.pattern.test(body));
        if (kw) {
          userState[from] = kw.state;
          trackEvent(from, kw.state, kw.option, "palavra_chave");
          const response = kw.state === "new_client" ? RESPONSES_NEW[kw.option] : RESPONSES_EXISTING[kw.option];
          await sendMessage(msg, response);
        } else {
          trackEvent(from, "new_client", body, "invalida");
          await sendMessage(msg, MSG_INVALID);
        }
      }
      return;
    }

    // Cliente existente.
    if (userState[from] === "existing_client") {
      if (RESPONSES_EXISTING[body]) {
        trackEvent(from, "existing_client", body, "opcao_menu");
        await sendMessage(msg, RESPONSES_EXISTING[body]);
      } else {
        const kw = KEYWORD_MAP.find((k) => k.pattern.test(body));
        if (kw) {
          userState[from] = kw.state;
          trackEvent(from, kw.state, kw.option, "palavra_chave");
          const response = kw.state === "new_client" ? RESPONSES_NEW[kw.option] : RESPONSES_EXISTING[kw.option];
          await sendMessage(msg, response);
        } else {
          trackEvent(from, "existing_client", body, "invalida");
          await sendMessage(msg, MSG_INVALID);
        }
      }
      return;
    }
  } catch (error) {
    console.error("❌ Erro ao processar mensagem:", error);
    try {
      await client.sendMessage(msg.from, "Ocorreu um erro no atendimento. Digite MENU para tentar novamente.");
    } catch (_) {}
  }
};

// Evento principal.
client.on("message", processIncomingMessage);

// Evento extra: em algumas versões/contas ele captura melhor mensagens novas.
client.on("message_create", processIncomingMessage);

console.log("🚀 Iniciando robô J&T Express...");
console.log("Aguarde o QR Code aparecer no terminal.");
client.initialize();
