// Edite estes dados quando receber as informações finais da Cris.
// Mantenha apenas categorias e quantidades, sem dados pessoais de clientes.
const dadosAtendimento = [
  {
    categoria: "Coleta",
    total: 18,
    resolvido: 88,
    encaminhado: false,
    recomendacao: "Manter a resposta de coleta bem visível no chatbot, pois foi o assunto com maior volume no período analisado."
  },
  {
    categoria: "Portal VIP",
    total: 15,
    resolvido: 90,
    encaminhado: false,
    recomendacao: "Criar resposta objetiva com orientações de acesso, funções principais e uso do portal."
  },
  {
    categoria: "Prazos",
    total: 14,
    resolvido: 92,
    encaminhado: false,
    recomendacao: "Padronizar respostas sobre prazos para reduzir dúvidas repetitivas no atendimento."
  },
  {
    categoria: "Cadastro",
    total: 12,
    resolvido: 85,
    encaminhado: false,
    recomendacao: "Disponibilizar no chatbot um passo a passo inicial para novos clientes."
  },
  {
    categoria: "Tickets",
    total: 10,
    resolvido: 75,
    encaminhado: false,
    recomendacao: "Explicar quando abrir ticket, como acompanhar e quais informações devem ser enviadas."
  },
  {
    categoria: "Atendimento humano",
    total: 9,
    resolvido: 0,
    encaminhado: true,
    recomendacao: "Direcionar corretamente para atendimento humano quando a solicitação exigir análise específica."
  },
  {
    categoria: "Financeiro",
    total: 8,
    resolvido: 72,
    encaminhado: true,
    recomendacao: "Encaminhar assuntos financeiros para o setor responsável, mantendo orientação inicial no chatbot."
  },
  {
    categoria: "Pedido não localizado",
    total: 7,
    resolvido: 70,
    encaminhado: false,
    recomendacao: "Orientar quais dados o cliente precisa reunir antes de acionar o suporte."
  },
  {
    categoria: "Ressarcimento",
    total: 6,
    resolvido: 68,
    encaminhado: true,
    recomendacao: "Informar os requisitos básicos e encaminhar para análise do setor responsável."
  },
  {
    categoria: "Avaria ou violação",
    total: 5,
    resolvido: 65,
    encaminhado: false,
    recomendacao: "Orientar o cliente sobre fotos, evidências e abertura de chamado."
  },
  {
    categoria: "Extravio",
    total: 4,
    resolvido: 60,
    encaminhado: false,
    recomendacao: "Explicar que o caso precisa de análise e orientar a abertura de chamado."
  }
];

const totalDuvidas = document.getElementById("totalDuvidas");
const categoriaPrincipal = document.getElementById("categoriaPrincipal");
const resolvidasBot = document.getElementById("resolvidasBot");
const encaminhadas = document.getElementById("encaminhadas");
const donutTotal = document.getElementById("donutTotal");
const barChart = document.getElementById("barChart");
const legend = document.getElementById("legend");
const dataTable = document.getElementById("dataTable");
const detailBox = document.getElementById("detailBox");
const managerSummary = document.getElementById("managerSummary");

function renderDashboard() {
  const total = dadosAtendimento.reduce((sum, item) => sum + item.total, 0);
  const ordered = [...dadosAtendimento].sort((a, b) => b.total - a.total);
  const principal = ordered[0];
  const resolvidasPonderadas = dadosAtendimento.reduce((sum, item) => sum + item.total * item.resolvido, 0);
  const mediaResolvido = Math.round(resolvidasPonderadas / total);
  const totalEncaminhadas = dadosAtendimento
    .filter(item => item.encaminhado)
    .reduce((sum, item) => sum + item.total, 0);

  totalDuvidas.textContent = total;
  categoriaPrincipal.textContent = principal.categoria;
  resolvidasBot.textContent = `${mediaResolvido}%`;
  encaminhadas.textContent = totalEncaminhadas;
  donutTotal.textContent = total;

  renderBars(ordered);
  renderDonut(ordered, total);
  renderTable(ordered);
  renderSummary(ordered, total, totalEncaminhadas);
  selectCategory(principal.categoria);
}

function renderBars(ordered) {
  const max = Math.max(...ordered.map(item => item.total));

  barChart.innerHTML = ordered.map(item => {
    const width = Math.round((item.total / max) * 100);

    return `
      <div class="bar-row" data-category="${item.categoria}">
        <div class="bar-label">${item.categoria}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${width}%"></div>
        </div>
        <div class="bar-value">${item.total}</div>
      </div>
    `;
  }).join("");

  document.querySelectorAll(".bar-row").forEach(row => {
    row.addEventListener("click", () => {
      selectCategory(row.dataset.category);
    });
  });
}

function renderDonut(ordered, total) {
  const colors = ["#c91522", "#ef4444", "#fb7185", "#f97316", "#f59e0b", "#64748b"];
  const topItems = ordered.slice(0, 6);

  let start = 0;
  const slices = topItems.map((item, index) => {
    const degrees = (item.total / total) * 360;
    const end = start + degrees;
    const part = `${colors[index]} ${start}deg ${end}deg`;
    start = end;
    return part;
  });

  document.querySelector(".donut").style.background = `conic-gradient(${slices.join(", ")})`;

  legend.innerHTML = topItems.map((item, index) => {
    const percent = Math.round((item.total / total) * 100);
    return `
      <div class="legend-item">
        <div class="legend-left">
          <span class="legend-dot" style="background:${colors[index]}"></span>
          <span>${item.categoria}</span>
        </div>
        <strong>${percent}%</strong>
      </div>
    `;
  }).join("");
}

function renderTable(ordered) {
  dataTable.innerHTML = ordered.map(item => {
    const recomendacao = item.encaminhado
      ? "Encaminhar ao setor responsável"
      : "Priorizar resposta automática";

    return `
      <tr>
        <td><strong>${item.categoria}</strong></td>
        <td>${item.total}</td>
        <td>${item.resolvido}%</td>
        <td>
          <span class="badge ${item.encaminhado ? "warn" : "ok"}">
            ${item.encaminhado ? "Encaminhar" : "Automático"}
          </span>
        </td>
        <td>${recomendacao}</td>
      </tr>
    `;
  }).join("");
}

function renderSummary(ordered, total, totalEncaminhadas) {
  const top3 = ordered.slice(0, 3).map(item => item.categoria).join(", ");
  const encaminhamentoPercent = Math.round((totalEncaminhadas / total) * 100);

  managerSummary.innerHTML = `
    <div class="summary-item">
      <strong>Principais assuntos:</strong> ${top3}. Essas categorias devem ter respostas claras no chatbot.
    </div>
    <div class="summary-item">
      <strong>Encaminhamentos:</strong> ${encaminhamentoPercent}% das dúvidas exigem algum direcionamento humano ou setor específico.
    </div>
    <div class="summary-item">
      <strong>Aplicação prática:</strong> os dados ajudam a manter a qualidade do atendimento durante a transição dos vendedores internos para atuação externa.
    </div>
  `;
}

function selectCategory(categoryName) {
  const item = dadosAtendimento.find(dado => dado.categoria === categoryName);
  if (!item) return;

  document.querySelectorAll(".bar-row").forEach(row => {
    row.classList.toggle("active", row.dataset.category === categoryName);
  });

  const tipo = item.encaminhado ? "Encaminhamento" : "Resposta automática";
  const status = item.encaminhado
    ? "Essa categoria precisa de apoio humano ou setor específico."
    : "Essa categoria pode ser priorizada nas respostas automáticas do chatbot.";

  detailBox.innerHTML = `
    <h3>${item.categoria}</h3>
    <p>${status}</p>

    <div class="detail-metrics">
      <div class="detail-metric">
        <span>Total de dúvidas</span>
        <strong>${item.total}</strong>
      </div>
      <div class="detail-metric">
        <span>Resolvido pelo bot</span>
        <strong>${item.resolvido}%</strong>
      </div>
      <div class="detail-metric">
        <span>Tipo de tratamento</span>
        <strong>${tipo}</strong>
      </div>
    </div>

    <div class="recommendation">
      <strong>Recomendação:</strong> ${item.recomendacao}
    </div>
  `;
}

renderDashboard();
