/*
  Versão pública e sanitizada do chatbot.
  Contatos reais, canais internos, links operacionais e dados sensíveis foram removidos
  para preservar a confidencialidade da instituição parceira.
*/


const qrcode  = require("qrcode-terminal")
const { Client, LocalAuth } = require("whatsapp-web.js")
const fs      = require("fs")
const path    = require("path")

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: "jt-express-bot-publico"
  }),
  puppeteer: {
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  }
})

// ─── Configuração de Analytics ──────────────────────────────────────────────────
// Os arquivos são salvos na pasta /analytics (crie ou ajuste o caminho)
const ANALYTICS_DIR = path.join(__dirname, "analytics")
if (!fs.existsSync(ANALYTICS_DIR)) fs.mkdirSync(ANALYTICS_DIR, { recursive: true })

const FILES = {
  events:  path.join(ANALYTICS_DIR, "eventos.json"),       // cada interação
  summary: path.join(ANALYTICS_DIR, "resumo.json"),        // contadores agregados
  csv:     path.join(ANALYTICS_DIR, "eventos.csv"),        // para Excel / Power BI
}

// ─── Labels amigáveis para relatório ───────────────────────────────────────────
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
    "1":  "EC – Solicitar coleta",
    "2":  "EC – Acessar Portal VIP",
    "3":  "EC – Abrir ou acompanhar ticket",
    "4":  "EC – Pedido não localizado",
    "5":  "EC – Avaria / violação / falta de itens",
    "6":  "EC – Extravio",
    "7":  "EC – Ressarcimento",
    "8":  "EC – Financeiro ou cobrança",
    "9":  "EC – Consultar prazos",
    "10": "EC – Falar com atendimento humano",
  },
}

// ─── Inicializa / carrega resumo ────────────────────────────────────────────────
const loadSummary = () => {
  if (fs.existsSync(FILES.summary)) {
    return JSON.parse(fs.readFileSync(FILES.summary, "utf-8"))
  }
  return {
    totalAtendimentos: 0,
    totalMensagens: 0,
    opcoesPorPerfil: { initial: {}, new_client: {}, existing_client: {} },
    palavrasChaveUsadas: {},
    mensagensInvalidas: 0,
    atendimentosPorHora: {},   // "08", "09" ... "23"
    atendimentosPorDia: {},    // "2025-05-01"
  }
}

const saveSummary = (summary) => {
  fs.writeFileSync(FILES.summary, JSON.stringify(summary, null, 2), "utf-8")
}

// ─── Registra evento individual ────────────────────────────────────────────────
const CSV_HEADER = "timestamp,data,hora,numero_hash,perfil,opcao,label,tipo\n"

const initCsv = () => {
  if (!fs.existsSync(FILES.csv)) {
    fs.writeFileSync(FILES.csv, CSV_HEADER, "utf-8")
  }
}

const hashPhone = (from) => {
  // Ofusca o número para LGPD — mantém apenas os 4 últimos dígitos
  const digits = from.replace("@c.us", "")
  return "****" + digits.slice(-4)
}

const trackEvent = (from, state, option, tipo = "opcao_menu") => {
  const summary = loadSummary()
  const now     = new Date()
  const date    = now.toISOString().slice(0, 10)              // "2025-05-01"
  const hour    = String(now.getHours()).padStart(2, "0")     // "08"
  const ts      = now.toISOString()
  const label   = OPTION_LABELS[state]?.[option] ?? option

  // Atualiza resumo
  summary.totalMensagens++
  if (tipo === "saudacao_inicial") summary.totalAtendimentos++

  if (tipo === "opcao_menu" || tipo === "palavra_chave") {
    const perfil = summary.opcoesPorPerfil[state] ?? {}
    perfil[option]  = (perfil[option]  ?? 0) + 1
    summary.opcoesPorPerfil[state] = perfil
  }

  if (tipo === "palavra_chave") {
    summary.palavrasChaveUsadas[option] = (summary.palavrasChaveUsadas[option] ?? 0) + 1
  }

  if (tipo === "invalida") {
    summary.mensagensInvalidas++
  }

  summary.atendimentosPorHora[hour] = (summary.atendimentosPorHora[hour] ?? 0) + 1
  summary.atendimentosPorDia[date]  = (summary.atendimentosPorDia[date]  ?? 0) + 1

  saveSummary(summary)

  // Adiciona linha no CSV
  const row = `"${ts}","${date}","${hour}","${hashPhone(from)}","${state}","${option}","${label}","${tipo}"\n`
  fs.appendFileSync(FILES.csv, row, "utf-8")
}

initCsv()

// ─── Utilitários ────────────────────────────────────────────────────────────────

const delay = (ms) => new Promise((res) => setTimeout(res, ms))

const typingDuration = (text) => Math.min(Math.max(text.length * 40, 1000), 4000)

const sendMessage = async (msg, text) => {
  const chat = await msg.getChat()
  await chat.sendStateTyping()
  await delay(typingDuration(text))
  await client.sendMessage(msg.from, text)
}

// ─── Estado dos usuários ────────────────────────────────────────────────────────
const userState = {}

// ─── Mensagens ─────────────────────────────────────────────────────────────────

const MSG_WELCOME = (name) =>
  `Olá, *${name.split(" ")[0]}*! 😊 Seja bem-vindo ao atendimento virtual da *J&T Express*.\n\n` +
  `Antes de começarmos, escolha uma opção:\n\n` +
  `*1* - Sou cliente novo\n` +
  `*2* - Já sou cliente J&T`

const MSG_MENU_NEW_CLIENT =
  `Perfeito! 😊\n\n` +
  `Como você ainda é um cliente novo, escolha uma das opções abaixo:\n\n` +
  `*1* - Quero informações para cadastro\n` +
  `*2* - Quero saber como funciona a operação\n` +
  `*3* - Quero solicitar minha primeira coleta\n` +
  `*4* - Quero conhecer as regras de embalagem\n` +
  `*5* - Quero entender o Portal VIP\n` +
  `*6* - Falar com atendimento comercial\n\n` +
  `_Digite *MENU* a qualquer momento para voltar ao início._`

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
  `_Digite *MENU* a qualquer momento para voltar ao início._`

const MSG_INVALID =
  `Desculpe, não entendi sua opção. 😊\n\n` +
  `Digite apenas o *número* da opção desejada ou *MENU* para voltar ao início.`

// ─── Respostas: Cliente Novo ────────────────────────────────────────────────────

const RESPONSES_NEW = {
  "1":
    `Para iniciar seu cadastro como cliente J&T, é necessário falar com o setor comercial.\n\n` +
    `O setor comercial irá orientar sobre cadastro, negociação, tabela de valores, condições de envio e início da operação.\n\n` +
    `📩 *Contato comercial:*\n` +
    `[NOME REMOVIDO]\n` +
    `E-mail: [E-MAIL REMOVIDO]\n\n` +
    `Após o cadastro, você receberá orientações sobre acesso ao Portal VIP, regras de negócio, solicitação de coleta e materiais de apoio.\n\n` +
    `_Digite *MENU* para voltar ao início._`,

  "2":
    `A operação funciona assim:\n\n` +
    `1️⃣ Você realiza o cadastro com o setor comercial.\n` +
    `2️⃣ Após o cadastro, recebe acesso ao Portal VIP.\n` +
    `3️⃣ Pelo Portal VIP, pode gerar etiquetas, acompanhar pedidos, abrir tickets e consultar relatórios.\n` +
    `4️⃣ As coletas devem ser solicitadas conforme orientação da operação.\n` +
    `5️⃣ No momento da coleta, o romaneio deve ser assinado.\n` +
    `6️⃣ Em caso de ocorrência (avaria, extravio etc.), abra um ticket ou acione o canal correto.\n\n` +
    `⚠️ Importante seguir as regras de embalagem para evitar problemas no transporte.\n\n` +
    `_Digite *MENU* para voltar ao início._`,

  "3":
    `Para solicitar a sua primeira coleta, utilize o formulário abaixo:\n\n` +
    `🔗 [LINK REMOVIDO] +
    `⏰ A solicitação deve ser feita até às *16h* para que a coleta ocorra no dia seguinte.\n\n` +
    `Durante o início da operação, a coleta pode ser solicitada manualmente. Após avaliação, poderá ser verificada a possibilidade de coleta automática.\n\n` +
    `_Digite *MENU* para voltar ao início._`,

  "4":
    `As principais regras de embalagem são:\n\n` +
    `📦 Utilizar caixa de papelão duplo resistente;\n` +
    `🛡️ Usar proteção interna (plástico bolha, isopor ou material adequado);\n` +
    `⚠️ Solicitar aprovação prévia para itens frágeis (vidros e bebidas);\n` +
    `🚫 Não enviar produtos inflamáveis ou perigosos;\n` +
    `✅ Garantir que o produto esteja bem acondicionado.\n\n` +
    `A embalagem correta protege o produto e ajuda na análise em casos de avaria ou ressarcimento.\n\n` +
    `_Digite *MENU* para voltar ao início._`,

  "5":
    `O *Portal VIP* é a plataforma utilizada para gerenciar a operação com a J&T.\n\n` +
    `🔗 *Link de acesso:* [LINK REMOVIDO] +
    `Pelo Portal VIP, é possível:\n` +
    `• Acompanhar pedidos\n` +
    `• Abrir e acompanhar tickets\n` +
    `• Gerar etiquetas\n` +
    `• Extrair relatórios\n` +
    `• Consultar ocorrências\n` +
    `• Criar acessos para a equipe\n\n` +
    `💡 Recomenda-se que cada usuário tenha seu próprio acesso.\n\n` +
    `_Digite *MENU* para voltar ao início._`,

  "6":
    `Para falar com o atendimento comercial, entre em contato com:\n\n` +
    `👩‍💼 *[NOME REMOVIDO]*\n` +
    `📩 E-mail: [E-MAIL REMOVIDO]\n\n` +
    `O setor comercial poderá orientar sobre cadastro, negociação, tabela de valores e início da operação.\n\n` +
    `_Digite *MENU* para voltar ao início._`,
}

// ─── Respostas: Cliente Já Cadastrado ──────────────────────────────────────────

const RESPONSES_EXISTING = {
  "1":
    `Para solicitar coleta, utilize o formulário abaixo:\n\n` +
    `🔗 [LINK REMOVIDO] +
    `⏰ A solicitação deve ser feita até às *16h* para coleta no dia seguinte.\n\n` +
    `Caso não atinja a quantidade mínima de volumes, você pode entregar na base J&T mais próxima ou em um ponto *Drop Off*:\n` +
    `🔗 [LINK REMOVIDO] +
    `_Digite *MENU* para voltar ao início._`,

  "2":
    `Acesse o Portal VIP pelo link:\n\n` +
    `🔗 [LINK REMOVIDO] +
    `No Portal VIP você pode:\n` +
    `• Acompanhar pedidos\n` +
    `• Abrir e acompanhar tickets\n` +
    `• Gerar etiquetas\n` +
    `• Extrair relatórios\n` +
    `• Consultar pedidos por NF, chave de acesso ou código de rastreio\n` +
    `• Acompanhar resultados de tratativas\n\n` +
    `_Digite *MENU* para voltar ao início._`,

  "3":
    `Para abrir ou acompanhar tickets, acesse o Portal VIP:\n\n` +
    `🔗 [LINK REMOVIDO] +
    `Os chamados devem ser abertos em *Gestão Pós-vendas > Ordem de trabalho normal*.\n\n` +
    `Caso precise enviar vídeos ou arquivos que não possam ser anexados no chamado, encaminhe para:\n` +
    `📩 [E-MAIL REMOVIDO]\n\n` +
    `Informe no e-mail os dados do pedido e uma descrição clara do problema.\n\n` +
    `_Digite *MENU* para voltar ao início._`,

  "4":
    `Para pedidos não localizados ou volumes coletados sem registro no sistema, envie a solicitação para:\n\n` +
    `📩 [E-MAIL REMOVIDO]\n\n` +
    `Inclua as seguintes informações:\n` +
    `• Romaneio de coleta completo e assinado\n` +
    `• Código do pedido\n` +
    `• Ou chave de acesso da nota fiscal\n\n` +
    `_Digite *MENU* para voltar ao início._`,

  "5":
    `Em caso de avaria, violação ou falta de itens, reúna as seguintes evidências:\n\n` +
    `📸 Fotos de todas as etiquetas do volume\n` +
    `📸 Fotos nítidas da avaria ou violação\n` +
    `📸 Fotos dos itens avariados\n` +
    `📸 Fotos da embalagem e do acondicionamento interno\n` +
    `📋 Lista dos itens e valores (em caso de falta)\n\n` +
    `Depois, abra um ticket pelo Portal VIP:\n` +
    `🔗 [LINK REMOVIDO] +
    `_Digite *MENU* para voltar ao início._`,

  "6":
    `Em caso de extravio, abra um ticket pelo Portal VIP:\n\n` +
    `🔗 [LINK REMOVIDO] +
    `⏰ A reclamação deve ser feita em até *90 dias* após a coleta.\n\n` +
    `⚠️ Importante: o extravio *não gera ressarcimento automático*. O caso passa por análise.\n\n` +
    `Para assuntos de ressarcimento:\n` +
    `📩 [E-MAIL REMOVIDO]\n\n` +
    `_Digite *MENU* para voltar ao início._`,

  "7":
    `Para solicitar ressarcimento, envie a solicitação para:\n\n` +
    `📩 [E-MAIL REMOVIDO]\n\n` +
    `A solicitação deve conter:\n` +
    `• Código do pedido ou chave de acesso da NF\n` +
    `• Valor da NF\n` +
    `• Nome do destinatário\n` +
    `• Motivo da solicitação\n` +
    `• Data de criação do pedido\n\n` +
    `📊 Os dados devem ser enviados em planilha *Excel*.\n\n` +
    `⏰ Prazo para solicitação: até *90 dias* após a criação ou coleta do pedido.\n\n` +
    `_Digite *MENU* para voltar ao início._`,

  "8":
    `Para assuntos financeiros, faturamento ou cobrança, entre em contato pelos canais abaixo:\n\n` +
    `📩 *E-mails:*\n` +
    `[E-MAIL REMOVIDO]\n` +
    `[E-MAIL REMOVIDO]\n` +
    `[E-MAIL REMOVIDO]\n\n` +
    `📞 *Telefone:* [TELEFONE REMOVIDO]\n\n` +
    `👥 *Contatos:* [NOME REMOVIDO], [NOME REMOVIDO] e [NOME REMOVIDO].\n\n` +
    `_Digite *MENU* para voltar ao início._`,

  "9":
    `📋 *Principais prazos de atendimento:*\n\n` +
    `• Reclamações gerais: até *90 dias* após a coleta\n` +
    `• Acareação (entregue mas não recebido): contestação em até *30 dias úteis* após a baixa\n` +
    `• Retorno de acareação: até *72h úteis*\n` +
    `• Avaria após entrega: contestação em até *7 dias úteis*\n` +
    `• Retorno de avaria: até *72h úteis*\n` +
    `• Pedidos não localizados: contestação em até *30 dias úteis*\n` +
    `• Retorno de pedidos não localizados: até *48h úteis*\n` +
    `• Bloqueio ou interceptação: até *24h úteis* (não aplicável se o pedido estiver em rota)\n` +
    `• Posicionamento de entrega: retorno em até *48h úteis*\n` +
    `• Protocolo de entrega: até *24h*\n` +
    `• Contestação de protocolo de entrega: até *60 dias*\n` +
    `• Troca de etiqueta: contestar em até *7 dias úteis*, retorno em até *48h úteis*\n` +
    `• Ressarcimento: finalização em *30 a 45 dias* após recebimento e validação da Nota de Débito\n\n` +
    `_Digite *MENU* para voltar ao início._`,

  "10":
    `Para atendimento humano, escolha o canal adequado ao seu assunto:\n\n` +
    `🛒 *Comercial:*\n` +
    `[NOME REMOVIDO] - [E-MAIL REMOVIDO]\n\n` +
    `🎫 *Tickets e suporte Portal VIP:*\n` +
    `[E-MAIL REMOVIDO]\n\n` +
    `🔍 *Pedidos não localizados:*\n` +
    `[E-MAIL REMOVIDO]\n\n` +
    `💰 *Ressarcimento:*\n` +
    `[E-MAIL REMOVIDO]\n\n` +
    `💳 *Financeiro e cobrança:*\n` +
    `[E-MAIL REMOVIDO]\n` +
    `[E-MAIL REMOVIDO]\n` +
    `[E-MAIL REMOVIDO]\n\n` +
    `⚙️ *Apoio operacional:*\n` +
    `[NOME REMOVIDO] - [E-MAIL REMOVIDO] - [TELEFONE REMOVIDO]\n` +
    `[NOME REMOVIDO] - [E-MAIL REMOVIDO] - [TELEFONE REMOVIDO]\n\n` +
    `_Digite *MENU* para voltar ao início._`,
}

// ─── Palavras-chave ─────────────────────────────────────────────────────────────

const KEYWORD_MAP = [
  { pattern: /cadastro|contratar|começar|tabela de valores/i,         state: "new_client",      option: "1" },
  { pattern: /coleta|coletar|primeira coleta|formulário/i,            state: "existing_client", option: "1" },
  { pattern: /portal|vip|acesso|etiqueta|relatório/i,                 state: "existing_client", option: "2" },
  { pattern: /ticket|chamado|suporte|ocorrência/i,                    state: "existing_client", option: "3" },
  { pattern: /não localizado|busca|não encontrado|volume não/i,       state: "existing_client", option: "4" },
  { pattern: /avaria|violação|item faltando|produto danificado/i,     state: "existing_client", option: "5" },
  { pattern: /extravio|perdido|sumiu/i,                               state: "existing_client", option: "6" },
  { pattern: /ressarcimento|reembolso|indenização/i,                  state: "existing_client", option: "7" },
  { pattern: /financeiro|cobrança|boleto|faturamento|pagamento/i,     state: "existing_client", option: "8" },
  { pattern: /prazo|quanto tempo|sla|retorno/i,                       state: "existing_client", option: "9" },
  { pattern: /atendente|humano|falar com alguém/i,                    state: "existing_client", option: "10" },
]

// ─── QR Code e inicialização ────────────────────────────────────────────────────

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true })
})

client.on("ready", () => {
  console.log("✅ WhatsApp conectado! Bot J&T Express ativo.")
  console.log(`📊 Analytics salvos em: ${ANALYTICS_DIR}`)
})

client.on("auth_failure", (msg) => {
  console.log("Falha de autenticação:", msg)
})

client.on("disconnected", (reason) => {
  console.log("WhatsApp desconectado:", reason)
})

client.initialize()

// ─── Listener principal ─────────────────────────────────────────────────────────

client.on("message", async (msg) => {
  console.log("Mensagem recebida:", msg.from, msg.body)
  // ❌ Ignora grupos
  if (!msg.from.endsWith("@c.us")) return
  // ❌ Ignora mensagens do próprio bot
  if (msg.fromMe) return

  const from  = msg.from
  const body  = msg.body.trim()
  const upper = body.toUpperCase()

  // 🔁 MENU — volta ao início
  if (upper === "MENU") {
    userState[from] = "initial"
    const contact = await msg.getContact()
    const name    = contact.pushname || "cliente"
    trackEvent(from, "initial", "MENU", "comando_menu")
    await sendMessage(msg, MSG_WELCOME(name))
    return
  }

  // 👋 Saudação inicial
  if (
    !userState[from] ||
    userState[from] === "initial" ||
    /^(oi|olá|ola|bom dia|boa tarde|boa noite|menu|inicio|início|hey|hi|hello)$/i.test(body)
  ) {
    userState[from] = "initial"
    const contact = await msg.getContact()
    const name    = contact.pushname || "cliente"
    trackEvent(from, "initial", body, "saudacao_inicial")
    await sendMessage(msg, MSG_WELCOME(name))
    return
  }

  // ─── Estado: menu inicial ──────────────────────────────────────────────────
  if (userState[from] === "initial") {
    if (body === "1") {
      userState[from] = "new_client"
      trackEvent(from, "initial", "1", "opcao_menu")
      await sendMessage(msg, MSG_MENU_NEW_CLIENT)
    } else if (body === "2") {
      userState[from] = "existing_client"
      trackEvent(from, "initial", "2", "opcao_menu")
      await sendMessage(msg, MSG_MENU_EXISTING_CLIENT)
    } else {
      const kw = KEYWORD_MAP.find((k) => k.pattern.test(body))
      if (kw) {
        userState[from] = kw.state
        trackEvent(from, kw.state, kw.option, "palavra_chave")
        const response = kw.state === "new_client" ? RESPONSES_NEW[kw.option] : RESPONSES_EXISTING[kw.option]
        await sendMessage(msg, response)
      } else {
        trackEvent(from, "initial", body, "invalida")
        await sendMessage(msg, MSG_INVALID)
      }
    }
    return
  }

  // ─── Estado: cliente novo ──────────────────────────────────────────────────
  if (userState[from] === "new_client") {
    if (RESPONSES_NEW[body]) {
      trackEvent(from, "new_client", body, "opcao_menu")
      await sendMessage(msg, RESPONSES_NEW[body])
    } else {
      const kw = KEYWORD_MAP.find((k) => k.pattern.test(body))
      if (kw) {
        userState[from] = kw.state
        trackEvent(from, kw.state, kw.option, "palavra_chave")
        const response = kw.state === "new_client" ? RESPONSES_NEW[kw.option] : RESPONSES_EXISTING[kw.option]
        await sendMessage(msg, response)
      } else {
        trackEvent(from, "new_client", body, "invalida")
        await sendMessage(msg, MSG_INVALID)
      }
    }
    return
  }

  // ─── Estado: cliente já cadastrado ────────────────────────────────────────
  if (userState[from] === "existing_client") {
    if (RESPONSES_EXISTING[body]) {
      trackEvent(from, "existing_client", body, "opcao_menu")
      await sendMessage(msg, RESPONSES_EXISTING[body])
    } else {
      const kw = KEYWORD_MAP.find((k) => k.pattern.test(body))
      if (kw) {
        userState[from] = kw.state
        trackEvent(from, kw.state, kw.option, "palavra_chave")
        const response = kw.state === "new_client" ? RESPONSES_NEW[kw.option] : RESPONSES_EXISTING[kw.option]
        await sendMessage(msg, response)
      } else {
        trackEvent(from, "existing_client", body, "invalida")
        await sendMessage(msg, MSG_INVALID)
      }
    }
    return
  }
})