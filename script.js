const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");

const totalAtendimentos = document.getElementById("totalAtendimentos");
const totalResolvidas = document.getElementById("totalResolvidas");
const totalEncaminhadas = document.getElementById("totalEncaminhadas");
const categoryList = document.getElementById("categoryList");
const historyTable = document.getElementById("historyTable");

let state = "initial";
let analytics = {
  totalMensagens: 0,
  respostasAutomaticas: 0,
  encaminhamentos: 0,
  categorias: {},
  historico: []
};

const MENU_INICIAL =
  "Olá! 😊 Seja bem-vindo ao atendimento virtual da J&T Express.\n\n" +
  "Antes de começarmos, escolha uma opção:\n\n" +
  "1 - Sou cliente novo\n" +
  "2 - Já sou cliente J&T";

const MENU_CLIENTE_NOVO =
  "Perfeito! 😊\n\n" +
  "Como você ainda é um cliente novo, escolha uma das opções abaixo:\n\n" +
  "1 - Quero informações para cadastro\n" +
  "2 - Quero saber como funciona a operação\n" +
  "3 - Quero solicitar minha primeira coleta\n" +
  "4 - Quero conhecer as regras de embalagem\n" +
  "5 - Quero entender o Portal VIP\n" +
  "6 - Falar com atendimento comercial\n\n" +
  "Digite MENU a qualquer momento para voltar ao início.";

const MENU_CLIENTE_EXISTENTE =
  "Perfeito! 😊\n\n" +
  "Como você já é cliente J&T, escolha uma das opções abaixo:\n\n" +
  "1 - Solicitar coleta\n" +
  "2 - Acessar Portal VIP\n" +
  "3 - Abrir ou acompanhar ticket\n" +
  "4 - Pedido não localizado\n" +
  "5 - Avaria, violação ou falta de itens\n" +
  "6 - Extravio\n" +
  "7 - Ressarcimento\n" +
  "8 - Financeiro ou cobrança\n" +
  "9 - Consultar prazos\n" +
  "10 - Falar com atendimento humano\n\n" +
  "Digite MENU a qualquer momento para voltar ao início.";

const RESPOSTAS_NOVO = {
  "1": {
    categoria: "Cadastro",
    texto:
      "Para iniciar seu cadastro como cliente J&T, é necessário falar com o setor comercial.\n\n" +
      "O setor comercial irá orientar sobre cadastro, negociação, tabela de valores, condições de envio e início da operação.\n\n" +
      "Contato comercial: Fulano - fulano@jtexpress.com.br\n\n" +
      "Digite MENU para voltar ao início."
  },
  "2": {
    categoria: "Funcionamento da operação",
    texto:
      "A operação funciona assim:\n\n" +
      "1. O cliente realiza o cadastro com o setor comercial.\n" +
      "2. Após o cadastro, recebe acesso ao Portal VIP.\n" +
      "3. Pelo Portal VIP, pode gerar etiquetas, acompanhar pedidos, abrir tickets e consultar relatórios.\n" +
      "4. As coletas devem ser solicitadas conforme orientação da operação.\n\n" +
      "Digite MENU para voltar ao início."
  },
  "3": {
    categoria: "Primeira coleta",
    texto:
      "Para solicitar a primeira coleta, o cliente deve utilizar o formulário de coleta informado pela operação.\n\n" +
      "A solicitação deve ser feita até às 16h para que a coleta ocorra no dia seguinte.\n\n" +
      "Digite MENU para voltar ao início."
  },
  "4": {
    categoria: "Regras de embalagem",
    texto:
      "As principais regras de embalagem são: utilizar caixa resistente, proteção interna adequada, aprovação prévia para itens frágeis e não enviar produtos inflamáveis ou perigosos.\n\n" +
      "A embalagem correta ajuda a proteger o produto e facilita a análise em casos de avaria.\n\n" +
      "Digite MENU para voltar ao início."
  },
  "5": {
    categoria: "Portal VIP",
    texto:
      "O Portal VIP é a plataforma utilizada para gerenciar a operação com a J&T.\n\n" +
      "Nele é possível acompanhar pedidos, abrir tickets, gerar etiquetas, extrair relatórios e consultar ocorrências.\n\n" +
      "Digite MENU para voltar ao início."
  },
  "6": {
    categoria: "Atendimento comercial",
    encaminhar: true,
    texto:
      "Para falar com o atendimento comercial, entre em contato com Fulano pelo e-mail fulano@jtexpress.com.br.\n\n" +
      "Digite MENU para voltar ao início."
  }
};

const RESPOSTAS_EXISTENTE = {
  "1": {
    categoria: "Solicitar coleta",
    texto:
      "Para solicitar coleta, utilize o formulário informado pela operação.\n\n" +
      "A solicitação deve ser feita até às 16h para coleta no dia seguinte.\n\n" +
      "Digite MENU para voltar ao início."
  },
  "2": {
    categoria: "Portal VIP",
    texto:
      "No Portal VIP, o cliente pode acompanhar pedidos, abrir tickets, gerar etiquetas, consultar relatórios e verificar ocorrências.\n\n" +
      "Digite MENU para voltar ao início."
  },
  "3": {
    categoria: "Tickets",
    texto:
      "Para abrir ou acompanhar tickets, acesse o Portal VIP e utilize a área de Gestão Pós-vendas.\n\n" +
      "Caso precise enviar vídeos ou arquivos, encaminhe para pr.tickets@j&texpress.com.br.\n\n" +
      "Digite MENU para voltar ao início."
  },
  "4": {
    categoria: "Pedido não localizado",
    texto:
      "Para pedidos não localizados ou volumes coletados sem registro no sistema, é necessário informar dados do pedido, romaneio assinado ou chave de acesso da nota fiscal.\n\n" +
      "Digite MENU para voltar ao início."
  },
  "5": {
    categoria: "Avaria ou violação",
    texto:
      "Em caso de avaria, violação ou falta de itens, reúna fotos das etiquetas, da embalagem, do produto e do acondicionamento interno. Depois, abra um ticket pelo Portal VIP.\n\n" +
      "Digite MENU para voltar ao início."
  },
  "6": {
    categoria: "Extravio",
    texto:
      "Em caso de extravio, abra um ticket pelo Portal VIP. O caso passará por análise e não gera ressarcimento automático.\n\n" +
      "Digite MENU para voltar ao início."
  },
  "7": {
    categoria: "Ressarcimento",
    texto:
      "Para solicitar ressarcimento, devem ser informados dados do pedido, valor da nota fiscal, destinatário, motivo da solicitação e data de criação do pedido.\n\n" +
      "Digite MENU para voltar ao início."
  },
  "8": {
    categoria: "Financeiro ou cobrança",
    encaminhar: true,
    texto:
      "Para assuntos financeiros, faturamento ou cobrança, o atendimento deve ser encaminhado aos canais responsáveis do setor financeiro.\n\n" +
      "Digite MENU para voltar ao início."
  },
  "9": {
    categoria: "Prazos",
    texto:
      "Os prazos variam conforme o tipo de solicitação. Reclamações, avarias, pedidos não localizados e ressarcimentos seguem prazos específicos de análise e retorno.\n\n" +
      "Digite MENU para voltar ao início."
  },
  "10": {
    categoria: "Atendimento humano",
    encaminhar: true,
    texto:
      "Para atendimento humano, escolha o canal adequado ao assunto: comercial, tickets, pedidos não localizados, ressarcimento, financeiro ou apoio operacional.\n\n" +
      "Digite MENU para voltar ao início."
  }
};

const KEYWORDS = [
  { pattern: /cadastro|contratar|começar|tabela/i, state: "new_client", option: "1" },
  { pattern: /coleta|coletar|primeira coleta|formulário/i, state: "existing_client", option: "1" },
  { pattern: /portal|vip|acesso|etiqueta|relatório/i, state: "existing_client", option: "2" },
  { pattern: /ticket|chamado|suporte|ocorrência/i, state: "existing_client", option: "3" },
  { pattern: /não localizado|busca|não encontrado/i, state: "existing_client", option: "4" },
  { pattern: /avaria|violação|item faltando|danificado/i, state: "existing_client", option: "5" },
  { pattern: /extravio|perdido|sumiu/i, state: "existing_client", option: "6" },
  { pattern: /ressarcimento|reembolso|indenização/i, state: "existing_client", option: "7" },
  { pattern: /financeiro|cobrança|boleto|faturamento|pagamento/i, state: "existing_client", option: "8" },
  { pattern: /prazo|quanto tempo|sla|retorno/i, state: "existing_client", option: "9" },
  { pattern: /atendente|humano|falar com alguém/i, state: "existing_client", option: "10" }
];

function addMessage(text, sender) {
  const div = document.createElement("div");
  div.className = `message ${sender}`;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

function registerInteraction(perfil, categoria, tipo = "resposta_automatica", encaminhar = false) {
  analytics.totalMensagens++;
  if (encaminhar) analytics.encaminhamentos++;
  else analytics.respostasAutomaticas++;

  analytics.categorias[categoria] = (analytics.categorias[categoria] || 0) + 1;

  analytics.historico.unshift({
    hora: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    perfil,
    categoria,
    tipo: encaminhar ? "Encaminhar" : tipo
  });

  analytics.historico = analytics.historico.slice(0, 8);
  updateDashboard();
}

function updateDashboard() {
  totalAtendimentos.textContent = analytics.totalMensagens;
  totalResolvidas.textContent = analytics.respostasAutomaticas;
  totalEncaminhadas.textContent = analytics.encaminhamentos;

  const entries = Object.entries(analytics.categorias).sort((a, b) => b[1] - a[1]);
  const max = entries.length ? Math.max(...entries.map((entry) => entry[1])) : 1;

  categoryList.innerHTML = entries.length
    ? entries.map(([categoria, total]) => {
        const percent = Math.round((total / max) * 100);
        return `
          <div>
            <div class="category-name">${categoria}</div>
            <div class="category-row">
              <div class="bar"><span style="width:${percent}%"></span></div>
              <strong>${total}</strong>
            </div>
          </div>
        `;
      }).join("")
    : "<p class='subtitle'>Nenhuma interação registrada ainda.</p>";

  historyTable.innerHTML = analytics.historico.map((item) => `
    <tr>
      <td>${item.hora}</td>
      <td>${item.perfil}</td>
      <td>${item.categoria}</td>
      <td>${item.tipo}</td>
    </tr>
  `).join("");
}

function findKeywordResponse(text) {
  return KEYWORDS.find((keyword) => keyword.pattern.test(text));
}

function handleUserMessage(text) {
  const upper = text.toUpperCase();

  if (upper === "MENU") {
    state = "initial";
    addMessage(MENU_INICIAL, "bot");
    return;
  }

  if (/^(oi|olá|ola|bom dia|boa tarde|boa noite|menu|inicio|início)$/i.test(text)) {
    state = "initial";
    addMessage(MENU_INICIAL, "bot");
    return;
  }

  if (state === "initial") {
    if (text === "1") {
      state = "new_client";
      registerInteraction("Inicial", "Cliente novo");
      addMessage(MENU_CLIENTE_NOVO, "bot");
      return;
    }

    if (text === "2") {
      state = "existing_client";
      registerInteraction("Inicial", "Cliente J&T");
      addMessage(MENU_CLIENTE_EXISTENTE, "bot");
      return;
    }
  }

  const responseSource = state === "new_client" ? RESPOSTAS_NOVO : RESPOSTAS_EXISTENTE;

  if (responseSource[text]) {
    const response = responseSource[text];
    const perfil = state === "new_client" ? "Cliente novo" : "Cliente J&T";
    registerInteraction(perfil, response.categoria, "opcao_menu", response.encaminhar);
    addMessage(response.texto, "bot");
    return;
  }

  const keyword = findKeywordResponse(text);
  if (keyword) {
    const source = keyword.state === "new_client" ? RESPOSTAS_NOVO : RESPOSTAS_EXISTENTE;
    const response = source[keyword.option];

    state = keyword.state;
    registerInteraction(
      keyword.state === "new_client" ? "Cliente novo" : "Cliente J&T",
      response.categoria,
      "palavra_chave",
      response.encaminhar
    );
    addMessage(response.texto, "bot");
    return;
  }

  registerInteraction("Não identificado", "Mensagem inválida", "invalida", true);
  addMessage("Desculpe, não entendi sua opção. 😊\n\nDigite apenas o número da opção desejada ou MENU para voltar ao início.", "bot");
}

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = userInput.value.trim();
  if (!text) return;

  addMessage(text, "user");
  userInput.value = "";

  setTimeout(() => handleUserMessage(text), 450);
});

addMessage(MENU_INICIAL, "bot");
updateDashboard();
