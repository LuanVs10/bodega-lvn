/* Bodega LVN - script.js
   App PWA com LocalStorage para vendas e fiados (corrigido e melhorado).
*/

const KEY_SALES = "bodega_sales_v1";
const KEY_FIADOS = "bodega_fiados_v1";

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const btnAddSale = document.getElementById("btnAddSale");
  const formCard = document.getElementById("formCard");
  const saleForm = document.getElementById("saleForm");
  const btnCancelForm = document.getElementById("btnCancelForm");
  const listCard = document.getElementById("listCard");
  const listContent = document.getElementById("listContent");
  const listTitle = document.getElementById("listTitle");
  const btnShowSales = document.getElementById("btnShowSales");
  const btnShowFiados = document.getElementById("btnShowFiados");
  const fiadoCard = document.getElementById("fiadoCard");
  const fiadoForm = document.getElementById("fiadoForm");
  const fiadoList = document.getElementById("fiadoList");
  const btnExport = document.getElementById("btnExport");

  btnAddSale.onclick = () => openSaleForm();
  btnShowSales.onclick = () => showSales();
  btnShowFiados.onclick = () => showFiados();
  btnCancelForm.onclick = () => hideForm();
  btnExport.onclick = () => exportCSV();

  saleForm.addEventListener("submit", onSubmitSale);
  fiadoForm.addEventListener("submit", onSubmitFiado);

  // Initial render
  renderDashboard();
  showSales();

  // Service worker registration
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./service-worker.js").catch(() => {});
  }

  // ---------- Funções utilitárias ----------
  function readSales() {
    try {
      return JSON.parse(localStorage.getItem(KEY_SALES) || "[]");
    } catch (e) {
      return [];
    }
  }
  function writeSales(arr) {
    localStorage.setItem(KEY_SALES, JSON.stringify(arr));
  }

  function readFiados() {
    try {
      return JSON.parse(localStorage.getItem(KEY_FIADOS) || "[]");
    } catch (e) {
      return [];
    }
  }
  function writeFiados(arr) {
    localStorage.setItem(KEY_FIADOS, JSON.stringify(arr));
  }

  function money(v) {
    return "R$ " + Number(v || 0).toFixed(2).replace(".", ",");
  }

  // ---------- Dashboard ----------
  function renderDashboard() {
    const sales = readSales();
    const fiados = readFiados();

    const today = new Date();
    const date30 = new Date();
    date30.setDate(date30.getDate() - 30);

    let totalToday = 0;
    let total30 = 0;

    sales.forEach((s) => {
      const dataVenda = new Date(s.date);
      const mesmaData =
        dataVenda.getDate() === today.getDate() &&
        dataVenda.getMonth() === today.getMonth() &&
        dataVenda.getFullYear() === today.getFullYear();

      if (mesmaData) totalToday += Number(s.total);
      if (dataVenda >= date30) total30 += Number(s.total);
    });

    document.getElementById("totalToday").textContent = money(totalToday);
    document.getElementById("totalFiado").textContent = money(
      fiados.reduce((a, f) => a + Number(f.value), 0)
    );
    document.getElementById("total30").textContent = money(total30);
  }

  // ---------- Vendas ----------
  function openSaleForm() {
    formCard.hidden = false;
    listCard.hidden = true;
    fiadoCard.hidden = true;
    document.getElementById("formTitle").textContent = "Nova Venda";
    document.getElementById("inputProduct").focus();
  }
  function hideForm() {
    formCard.hidden = true;
    listCard.hidden = false;
    fiadoCard.hidden = true;
    saleForm.reset();
  }

  function onSubmitSale(e) {
    e.preventDefault();
    const product = document.getElementById("inputProduct").value.trim();
    const value = Number(document.getElementById("inputValue").value) || 0;
    const qty = Number(document.getElementById("inputQty").value) || 1;
    const client = document.getElementById("inputClient").value.trim();
    const payment = document.querySelector(
      'input[name="payment"]:checked'
    ).value;
    const total = Number((value * qty).toFixed(2));

    const sale = {
      id: Date.now(),
      product,
      value,
      qty,
      total,
      client: client || null,
      payment,
      date: nowCearaISO(), // hora do Ceará
    };

    const sales = readSales();
    sales.unshift(sale);
    writeSales(sales);

    if (payment === "fiado") {
      const fiados = readFiados();
      fiados.unshift({
        id: Date.now(),
        client: client || "Cliente sem nome",
        value: total,
        date: nowCearaISO(), // hora do Ceará
        due: null,
        status: "pendente",
      });
      writeFiados(fiados);
    }

    hideForm();
    renderDashboard();
    showSales();
  }

  function showSales() {
    formCard.hidden = true;
    listCard.hidden = false;
    fiadoCard.hidden = true;
    listTitle.textContent = "Histórico de Vendas";
    const sales = readSales();
    renderSalesList(sales);
  }

  function renderSalesList(sales) {
    listContent.innerHTML = "";
    if (!sales.length) {
      listContent.innerHTML =
        "<p class='meta'>Nenhuma venda registrada ainda.</p>";
      return;
    }
    sales.forEach((s) => {
      const div = document.createElement("div");
      div.className = "item";
      if (s.pago) div.classList.add("pago"); // 💚 pinta verde se foi pago
      div.innerHTML = `
        <div>
          <div style="font-weight:600">${escapeHTML(s.product)} ×${s.qty} • ${escapeHTML(
        s.payment
      )}</div>
          <div class="meta">${formatDateCeara(s.date)} ${
        s.client ? "• Cliente: " + escapeHTML(s.client) : ""
      }</div>
        </div>
        <div class="right">
          <div style="font-weight:700">${money(s.total)}</div>
          <button class="small-btn" data-id="${s.id}" onclick="onReprint(${s.id})">Cupom</button>
          <button class="small-btn danger" data-id="${s.id}" onclick="onDeleteSale(${s.id})">Excluir</button>
        </div>
      `;
      listContent.appendChild(div);
    });

    window.onDeleteSale = (id) => {
      if (!confirm("Excluir venda?")) return;
      const arr = readSales().filter((x) => x.id !== id);
      writeSales(arr);
      renderDashboard();
      renderSalesList(arr);
    };

    window.onReprint = (id) => {
      const sale = readSales().find((x) => x.id === id);
      if (!sale) return alert("Venda não encontrada.");
      const html = generateReceiptHTML(sale);
      const w = window.open("", "_blank", "width=400,height=600");
      w.document.write(html);
      w.document.close();
      w.focus();
      w.print();
    };
  }

  // ---------- Fiados ----------
  function showFiados() {
    formCard.hidden = true;
    listCard.hidden = true;
    fiadoCard.hidden = false;
    renderFiados();
  }

  function onSubmitFiado(e) {
    e.preventDefault();
    const client = document.getElementById("fiadoClient").value.trim();
    const value = Number(document.getElementById("fiadoValue").value) || 0;
    const due = document.getElementById("fiadoDue").value || null;
    const fiados = readFiados();
    fiados.unshift({
      id: Date.now(),
      client,
      value,
      date: nowCearaISO(), // hora do Ceará
      due,
      status: "pendente",
    });
    writeFiados(fiados);
    fiadoForm.reset();
    renderFiados();
    renderDashboard();
  }

  function renderFiados() {
    fiadoList.innerHTML = "";
    const fiados = readFiados();
    if (!fiados.length) {
      fiadoList.innerHTML = "<p class='meta'>Nenhum fiado registrado.</p>";
      return;
    }
    fiados.forEach((f) => {
      const overdue =
        f.due && new Date(f.due) < new Date() && f.status === "pendente";
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = `
        <div>
          <div style="font-weight:600">${escapeHTML(f.client)} • ${money(
        f.value
      )}</div>
          <div class="meta">Compra: ${formatDateCeara(f.date)} ${
        f.due ? " • Venc: " + f.due : ""
      }</div>
        </div>
        <div class="right">
          <button class="small-btn" onclick="onMarkPaid(${f.id})">Marcar Pago</button>
          <button class="small-btn danger" onclick="onRemoveFiado(${f.id})">Remover</button>
        </div>
      `;
      if (overdue) div.style.borderLeft = "4px solid var(--danger)";
      fiadoList.appendChild(div);
    });

    // ✅ Marcar como pago
    window.onMarkPaid = (id) => {
      if (!confirm("Marcar como pago?")) return;

      const fiados = readFiados();
      const idx = fiados.findIndex((x) => x.id === id);
      if (idx === -1) return;

      const pago = fiados[idx];
      pago.status = "pago";
      pago.paidAt = nowCearaISO(); // hora do Ceará

      // Move para vendas
      const sales = readSales();
      sales.unshift({
        id: pago.id,
        product: "Venda fiado quitada",
        qty: 1,
        value: pago.value,
        total: pago.value,
        client: pago.client,
        payment: "fiado pago",
        date: pago.paidAt,
        pago: true,
      });
      writeSales(sales);

      // Remove dos fiados
      fiados.splice(idx, 1);
      writeFiados(fiados);

      renderFiados();
      renderDashboard();
      showSales(); // mostra nas vendas com destaque verde
    };

    window.onRemoveFiado = (id) => {
      if (!confirm("Remover fiado?")) return;
      const arr = readFiados().filter((x) => x.id !== id);
      writeFiados(arr);
      renderFiados();
      renderDashboard();
    };
  }

  // ---------- Exportação ----------
  function exportCSV() {
    const sales = readSales();
    if (!sales.length) return alert("Não há vendas para exportar.");
    const rows = [
      [
        "id",
        "produto",
        "valor_unit",
        "quantidade",
        "total",
        "cliente",
        "payment",
        "date",
      ],
    ];
    sales.forEach((s) => {
      rows.push([
        s.id,
        s.product,
        s.value,
        s.qty,
        s.total,
        s.client || "",
        s.payment,
        s.date,
      ]);
    });
    const csv = rows
      .map((r) =>
        r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bodega_vendas.csv";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 500);
  }

  function generateReceiptHTML(s) {
    return `
      <html><head><meta charset="utf-8"><title>Cupom</title>
      <style>
        body{font-family:Arial;padding:16px;color:#000}
        h2{text-align:center}
        .line{display:flex;justify-content:space-between}
      </style></head><body>
      <h2>Bodega LVN</h2>
      <div class="meta">Venda: ${s.id} • ${formatDateCeara(s.date)}</div>
      <hr/>
      <div class="line"><div>${escapeHTML(
        s.product
      )} x${s.qty}</div><div>${money(s.total)}</div></div>
      <hr/>
      <div>Total: <strong>${money(s.total)}</strong></div>
      <div>Forma: ${escapeHTML(s.payment)}</div>
      <div style="margin-top:12px;font-size:12px;color:#555">Obrigado pela preferência!</div>
      </body></html>
    `;
  }

  function escapeHTML(str) {
    if (!str) return "";
    return String(str).replace(
      /[&<>"']/g,
      (m) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[m])
    );
  }

  // ---------- Horário do Ceará ----------
  // Retorna a data/hora atual em ISO no fuso do Ceará (UTC-3)
  function nowCearaISO() {
    const d = new Date();
    const utc = d.getTime() + d.getTimezoneOffset() * 60000; 
    const cearaTime = new Date(utc - 3 * 60 * 60 * 1000); 
    return cearaTime.toISOString();
  }

  // Formata uma data ISO para horário do Ceará em formato legível
  function formatDateCeara(iso) {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { timeZone: "America/Fortaleza" });
  }

  window.generateReceiptHTML = generateReceiptHTML;
});
