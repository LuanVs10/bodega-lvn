// ===============================
// Funções de Data e Hora (Ceará)
// ===============================
function nowLocalISO() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Fortaleza",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });

  const parts = formatter.formatToParts(new Date());
  const values = Object.fromEntries(parts.map(p => [p.type, p.value]));

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}:${values.second}`;
}

function formatDateLocal(iso) {
  const d = new Date(iso);
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Fortaleza",
    hour12: false,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// ===============================
// Dados e Inicialização
// ===============================
let vendas = JSON.parse(localStorage.getItem("vendas")) || [];

function salvarVendas() {
  localStorage.setItem("vendas", JSON.stringify(vendas));
}

// ===============================
// Adicionar Venda
// ===============================
function adicionarVenda() {
  const cliente = document.getElementById("cliente").value.trim();
  const valor = parseFloat(document.getElementById("valor").value);
  const tipo = document.querySelector('input[name="tipo"]:checked')?.value;

  if (!cliente || isNaN(valor) || !tipo) {
    alert("Preencha todos os campos corretamente!");
    return;
  }

  const novaVenda = {
    id: Date.now(),
    cliente,
    valor,
    tipo,
    data: nowLocalISO(),
    pago: tipo === "avista"
  };

  vendas.push(novaVenda);
  salvarVendas();
  atualizarListas();

  document.getElementById("cliente").value = "";
  document.getElementById("valor").value = "";
}

// ===============================
// Atualizar Listas
// ===============================
function atualizarListas() {
  const diariaLista = document.getElementById("listaDiaria");
  const mensalLista = document.getElementById("listaMensal");
  const fiadoLista = document.getElementById("listaFiado");

  diariaLista.innerHTML = "";
  mensalLista.innerHTML = "";
  fiadoLista.innerHTML = "";

  let totalDiario = 0;
  let totalMensal = 0;

  const hoje = new Date().toLocaleDateString("en-CA", { timeZone: "America/Fortaleza" });
  const mesAtual = hoje.slice(0, 7);

  vendas.forEach(venda => {
    const dataVenda = new Date(venda.data);
    const dataFormatada = formatDateLocal(venda.data);

    const item = document.createElement("li");
    item.textContent = `${venda.cliente} - R$ ${venda.valor.toFixed(2)} (${venda.tipo}) - ${dataFormatada}`;

    // ✅ Cor verde se for fiado e pago
    if (venda.tipo === "fiado" && venda.pago) {
      item.style.backgroundColor = "#90ee90"; // verde claro
    }

    // Botão de pagamento (apenas para fiado)
    if (venda.tipo === "fiado" && !venda.pago) {
      const btnPagar = document.createElement("button");
      btnPagar.textContent = "Marcar como pago";
      btnPagar.onclick = () => marcarComoPago(venda.id);
      item.appendChild(btnPagar);
    }

    // Botão de excluir
    const btnExcluir = document.createElement("button");
    btnExcluir.textContent = "Excluir";
    btnExcluir.onclick = () => excluirVenda(venda.id);
    item.appendChild(btnExcluir);

    // Inserir nas listas corretas
    if (venda.tipo === "fiado" && !venda.pago) {
      fiadoLista.appendChild(item);
    }
    if (venda.data.startsWith(mesAtual)) {
      mensalLista.appendChild(item);
      totalMensal += venda.valor;
    }
    if (venda.data.startsWith(hoje)) {
      diariaLista.appendChild(item);
      totalDiario += venda.valor;
    }
  });

  document.getElementById("totalDiario").textContent = totalDiario.toFixed(2);
  document.getElementById("totalMensal").textContent = totalMensal.toFixed(2);
}

// ===============================
// Funções de Controle
// ===============================
function marcarComoPago(id) {
  const venda = vendas.find(v => v.id === id);
  if (venda) {
    venda.pago = true;
    salvarVendas();
    atualizarListas();
  }
}

function excluirVenda(id) {
  vendas = vendas.filter(v => v.id !== id);
  salvarVendas();
  atualizarListas();
}

// ===============================
// Inicialização
// ===============================
document.addEventListener("DOMContentLoaded", atualizarListas);
