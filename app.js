 import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";

import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  getDoc,
  setDoc
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";

import { firebaseConfig } from "./firebase-config.js";

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const cloudDB = getFirestore(firebaseApp);

const KEY = "control-cash-v1";
const today = () => new Date().toISOString().slice(0, 10);

let db = load();
let cloudReady = false;

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {
      clients: [],
      loans: [],
      payments: []
    };
  } catch {
    return { clients: [], loans: [], payments: [] };
  }
}
const $ = id => document.getElementById(id);

const money = (n, c) =>
  new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: c === "USD" ? "USD" : "DOP"
  }).format(Number(n) || 0);

const fmt = d =>
  d ? new Date(d + "T12:00:00").toLocaleDateString("es-DO") : "—";

const sum = a => a.reduce((s, x) => s + Number(x || 0), 0);

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[c]));

function clientName(id) {
  return db.clients.find(c => c.id === id)?.name || "Cliente eliminado";
}

function paid(loanId) {
  return sum(db.payments
    .filter(p => p.loanId === loanId)
    .map(p => p.amount));
}

function totals(currency) {
  const loans = db.loans.filter(l => l.currency === currency);

  return {
    capital: sum(loans.map(l => l.principal)),
    interest: sum(loans.map(l => l.interest)),
    due: sum(loans.map(l =>
      Math.max(0, l.total - paid(l.id))
    )),
    active: loans.filter(l => paid(l.id) < l.total).length
  };
}

function status(l) {
  return paid(l.id) >= l.total
    ? "PAGADO"
    : new Date(l.end + "T23:59:59") < new Date()
      ? "ATRASADO"
      : "ACTIVO";
}
function render() {
  const d = totals("DOP");
  const u = totals("USD");

  $("totalDue").textContent =
    `${money(d.due, "DOP")} · ${money(u.due, "USD")}`;

  $("capital").textContent =
    `${money(d.capital, "DOP")} / ${money(u.capital, "USD")}`;

  $("interest").textContent =
    `${money(d.interest, "DOP")} / ${money(u.interest, "USD")}`;

  $("clientsCount").textContent = db.clients.length;
  $("activeCount").textContent = d.active + u.active;

  $("lateCount").textContent =
    db.loans.filter(l => status(l) === "ATRASADO").length + " atrasados";

  $("clientsList").innerHTML = db.clients.length
    ? db.clients.map(c => `
      <div class="listitem">
        <div>
          <b>${esc(c.name)}</b>
          <div class="muted">
            ${esc(c.phone || "Sin teléfono")} · ${esc(c.identity || "Sin ID")}
          </div>
        </div>
        <button class="danger smallbtn" data-delete-client="${esc(c.id)}">
          Eliminar
        </button>
      </div>
    `).join("")
    : '<div class="empty">No hay clientes todavía.</div>';

  $("loanClient").innerHTML =
    '<option value="">Seleccionar cliente</option>' +
    db.clients.map(c =>
      `<option value="${esc(c.id)}">${esc(c.name)}</option>`
    ).join("");

  $("paymentLoan").innerHTML =
    '<option value="">Seleccionar préstamo</option>' +
    db.loans.filter(l => paid(l.id) < l.total).map(l =>
      `<option value="${esc(l.id)}">
        ${esc(clientName(l.clientId))} ·
        ${money(l.total - paid(l.id), l.currency)} pendiente
      </option>`
    ).join("");

  $("loansList").innerHTML = db.loans.length
    ? db.loans.slice().reverse().map(l => `
      <div class="listitem">
        <div>
          <b>${esc(clientName(l.clientId))}</b>
          <span class="pill ${
            status(l) === "ATRASADO" ? "red" :
            status(l) === "PAGADO" ? "green" : ""
          }">${status(l)}</span>
          <div class="muted">
            ${money(l.principal, l.currency)} ·
            ${l.rate}% semanal · ${l.weeks} semanas
          </div>
          <div class="muted">
            Total ${money(l.total, l.currency)} ·
            Saldo ${money(Math.max(0, l.total - paid(l.id)), l.currency)}
          </div>
        </div>
        <button class="secondary smallbtn" data-loan-detail="${esc(l.id)}">
          Ver
        </button>
      </div>
    `).join("")
    : '<div class="empty">No hay préstamos registrados.</div>';

  $("paymentsList").innerHTML = db.payments.length
    ? db.payments.slice().reverse().map(p => {
        const l = db.loans.find(x => x.id === p.loanId);
        return `
          <div class="listitem">
            <div>
              <b>${money(p.amount, p.currency)}</b>
              <div class="muted">
                ${esc(clientName(l?.clientId))} ·
                ${fmt(p.date)} · ${esc(p.method)}
              </div>
            </div>
            <span class="pill green">Recibido</span>
          </div>
        `;
      }).join("")
    : '<div class="empty">No hay cobros registrados.</div>';

  $("recent").innerHTML = db.payments.length
    ? db.payments.slice(-4).reverse().map(p => `
      <div class="listitem">
        <div>
          <b>${money(p.amount, p.currency)}</b>
          <div class="muted">
            ${fmt(p.date)} ·
            ${esc(clientName(db.loans.find(l => l.id === p.loanId)?.clientId))}
          </div>
        </div>
      </div>
    `).join("")
    : "Todavía no hay movimientos.";

  $("reportSummary").innerHTML = `
    <p><b>Clientes:</b> ${db.clients.length}</p>
    <p><b>Préstamos:</b> ${db.loans.length}</p>
    <p><b>Cobros:</b> ${db.payments.length}</p>
    <p><b>Saldo RD$:</b> ${money(d.due, "DOP")}</p>
    <p><b>Saldo US$:</b> ${money(u.due, "USD")}</p>
  `;
}

function save() {
  localStorage.setItem(KEY, JSON.stringify(db));
  render();

  if (auth.currentUser && cloudReady) {
    setDoc(
      doc(cloudDB, "users", auth.currentUser.uid, "data", "main"),
      db
    ).catch(error => {
      alert("Error guardando en Firebase: " + error.message);
    });
  }
}

function show(tab) {
  document.querySelectorAll("main>section")
    .forEach(s => s.classList.add("hidden"));

  $(tab).classList.remove("hidden");

  document.querySelectorAll(".tab").forEach(b => {
    b.classList.toggle("active", b.dataset.tab === tab);
  });
}
document.querySelectorAll(".tab").forEach(b => {
  b.addEventListener("click", () => show(b.dataset.tab));
});
$("paymentLoan").addEventListener("change", () => {
  const loan = db.loans.find(
    l => l.id === $("paymentLoan").value
  );

  if (loan) {
    $("paymentCurrency").value = loan.currency;
  }
});

$("paymentForm").addEventListener("submit", e => {
  e.preventDefault();

  const form = e.currentTarget;

  const loanId = form.elements.loanId.value;
  const amount = Number(form.elements.amount.value);
  const date = form.elements.date.value;
  const loan = db.loans.find(l => l.id === loanId);

  if (!loan || amount <= 0 || !date) {
    alert("Revisa los datos del cobro.");
    return;
  }

  const balance = loan.total - paid(loanId);

  if (balance <= 0) {
    alert("Este préstamo ya está pagado.");
    return;
  }

  if (amount > balance) {
    alert("El cobro supera el saldo pendiente: " +
      money(balance, loan.currency));
    return;
  }

  db.payments.push({
    id: crypto.randomUUID(),
    loanId,
    amount,
    currency: loan.currency,
    date,
    method: form.elements.method.value,
    reference: form.elements.reference.value.trim(),
    created: today()
  });

  save();
  form.reset();

  alert("Pago registrado correctamente.");
});
document.addEventListener("click", e => {
  const deleteButton = e.target.closest("[data-delete-client]");

  if (deleteButton) {
    const id = deleteButton.dataset.deleteClient;

    const hasLoans = db.loans.some(l => l.clientId === id);

    if (hasLoans) {
      alert("No puedes eliminar este cliente porque tiene préstamos registrados.");
      return;
    }

    if (confirm("¿Seguro que deseas eliminar este cliente?")) {
      db.clients = db.clients.filter(c => c.id !== id);
      save();
    }

    return;
  }

  const detailButton = e.target.closest("[data-loan-detail]");

  if (detailButton) {
    const id = detailButton.dataset.loanDetail;
    const loan = db.loans.find(l => l.id === id);

    if (!loan) return;

    const balance = Math.max(0, loan.total - paid(id));

    alert(
      "DETALLE DEL PRÉSTAMO\n\n" +
      "Cliente: " + clientName(loan.clientId) + "\n" +
      "Capital: " + money(loan.principal, loan.currency) + "\n" +
      "Interés: " + money(loan.interest, loan.currency) + "\n" +
      "Total: " + money(loan.total, loan.currency) + "\n" +
      "Pagado: " + money(paid(id), loan.currency) + "\n" +
      "Pendiente: " + money(balance, loan.currency) + "\n" +
      "Estado: " + status(loan)
    );
  }
});
function download(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();

  URL.revokeObjectURL(url);
}

$("backup").addEventListener("click", () => {
  download(
    "prestamos-pro-respaldo.json",
    JSON.stringify(db, null, 2),
    "application/json"
  );
});

$("exportCsv").addEventListener("click", () => {
  const rows = [
    ["Cliente", "Moneda", "Capital", "Interes", "Total", "Pagado", "Pendiente", "Estado"],
    ...db.loans.map(l => [
      clientName(l.clientId),
      l.currency,
      l.principal,
      l.interest,
      l.total,
      paid(l.id),
      Math.max(0, l.total - paid(l.id)),
      status(l)
    ])
  ];

  const csv = rows
    .map(row => row.map(value =>
      '"' + String(value ?? "").replace(/"/g, '""') + '"'
    ).join(","))
    .join("\n");

  download("prestamos-pro-informes.csv", "\uFEFF" + csv, "text/csv;charset=utf-8");
});

$("restore").addEventListener("change", async e => {
  const file = e.target.files[0];

  if (!file) return;

  if (!confirm("¿Deseas restaurar esta copia? Los datos actuales serán reemplazados.")) {
    e.target.value = "";
    return;
  }

  try {
    const data = JSON.parse(await file.text());

    if (
      !Array.isArray(data.clients) ||
      !Array.isArray(data.loans) ||
      !Array.isArray(data.payments)
    ) {
      throw new Error("El archivo no tiene el formato correcto.");
    }

    db = data;
    save();

    alert("Copia de seguridad restaurada correctamente.");
  } catch (error) {
    alert("No se pudo restaurar: " + error.message);
  }

  e.target.value = "";
});
const loginHTML = `
  <div id="loginPanel" style="
    max-width:420px;
    margin:60px auto;
    padding:25px;
    background:white;
    border-radius:14px;
    box-shadow:0 4px 20px #0002;
    font-family:Arial,sans-serif;
  ">
    <h2 style="text-align:center;color:#142d4e">
      PRÉSTAMOS PRO
    </h2>
    <p style="text-align:center">Acceso privado de administrador</p>

    <form id="loginForm">
      <input
        id="loginEmail"
        type="email"
        placeholder="Correo electrónico"
        required
        style="width:100%;padding:13px;margin:8px 0;box-sizing:border-box"
      >

      <input
        id="loginPassword"
        type="password"
        placeholder="Contraseña"
        required
        style="width:100%;padding:13px;margin:8px 0;box-sizing:border-box"
      >

      <button
        type="submit"
        style="width:100%;padding:13px;background:#142d4e;color:white;border:0;border-radius:8px"
      >
        INICIAR SESIÓN
      </button>
    </form>

    <p id="loginMessage" style="color:#b00020;text-align:center"></p>
  </div>
`;

document.body.insertAdjacentHTML("afterbegin", loginHTML);

const loginPanel = $("loginPanel");
const appHeader = document.querySelector("header");
const appMain = document.querySelector("main");

function showLogin(message = "") {
  cloudReady = false;
  loginPanel.style.display = "block";

  if (appHeader) appHeader.style.display = "none";
  if (appMain) appMain.style.display = "none";

  $("loginMessage").textContent = message;
}

function showApp() {
  loginPanel.style.display = "none";

  if (appHeader) appHeader.style.display = "";
  if (appMain) appMain.style.display = "";

  let cloudBar = $("cloudBar");

  if (!cloudBar) {
    cloudBar = document.createElement("div");
    cloudBar.id = "cloudBar";
    cloudBar.style.cssText =
      "padding:10px;text-align:right;background:#e8f5e9;font-family:Arial";

    cloudBar.innerHTML = `
      <span style="color:#176b35">● Conectado a la nube</span>
      <button id="logoutButton" style="margin-left:12px">
        Cerrar sesión
      </button>
    `;

    appHeader.insertAdjacentElement("afterend", cloudBar);

    $("logoutButton").addEventListener("click", async () => {
      cloudReady = false;
      await signOut(auth);
    });
  }

  cloudBar.style.display = "block";
  render();
}

$("loginForm").addEventListener("submit", async e => {
  e.preventDefault();

  $("loginMessage").textContent = "Verificando acceso...";

  try {
    await signInWithEmailAndPassword(
      auth,
      $("loginEmail").value.trim(),
      $("loginPassword").value
    );
  } catch (error) {
    $("loginMessage").textContent =
      "No se pudo iniciar sesión: " + error.message;
  }
});

onAuthStateChanged(auth, async user => {
  if (!user) {
    const cloudBar = $("cloudBar");

    if (cloudBar) cloudBar.style.display = "none";

    showLogin();
    return;
  }

  cloudReady = false;
  $("loginMessage").textContent = "Cargando tus datos...";

  try {
    const ref = doc(
      cloudDB,
      "users",
      user.uid,
      "data",
      "main"
    );

    const snapshot = await getDoc(ref);

    if (snapshot.exists()) {
      const cloudData = snapshot.data();

      if (
        Array.isArray(cloudData.clients) &&
        Array.isArray(cloudData.loans) &&
        Array.isArray(cloudData.payments)
      ) {
        db = cloudData;
      } else {
        throw new Error("Los datos guardados no tienen el formato esperado.");
      }
    } else {
      await setDoc(ref, db);
    }

    localStorage.setItem(KEY, JSON.stringify(db));

    cloudReady = true;
    showApp();

  } catch (error) {
    showLogin("Error de conexión: " + error.message);
  }
});
