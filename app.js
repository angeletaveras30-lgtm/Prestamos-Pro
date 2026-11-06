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
// Aplicación local-first. Para habilitar nube, configura Firebase según README.
const KEY="control-cash-v1";
 const today=()=>new Date().toISOString().slice(0,10);
let db=load();
let cloudReady=false;
let saving=false;

function load(){
  try{
    return JSON.parse(localStorage.getItem(KEY))||{
      clients:[],loans:[],payments:[]
    };
  }catch{
    return {clients:[],loans:[],payments:[]};
  }
}

async function save(){
  localStorage.setItem(KEY,JSON.stringify(db));
  render();

  if(auth.currentUser && cloudReady){
    try{
      await setDoc(
        doc(cloudDB,"users",auth.currentUser.uid,"data","main"),
        db
      );
    }catch(error){
      alert("Error guardando en la nube: "+error.message);
    }
  }
}
const $=id=>document.getElementById(id);
const money=(n,c)=>new Intl.NumberFormat("es-DO",{style:"currency",currency:c==="USD"?"USD":"DOP"}).format(Number(n)||0);
const fmt=d=>d?new Date(d+"T12:00:00").toLocaleDateString("es-DO"):"—";
const sum=a=>a.reduce((s,x)=>s+Number(x),0);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function clientName(id){return db.clients.find(c=>c.id===id)?.name||"Cliente eliminado"}
function paid(loanId){return sum(db.payments.filter(p=>p.loanId===loanId).map(p=>p.amount))}
function totals(currency){const ls=db.loans.filter(l=>l.currency===currency);return {capital:sum(ls.map(l=>l.principal)),interest:sum(ls.map(l=>l.interest)),due:sum(ls.map(l=>Math.max(0,l.total-paid(l.id)))),active:ls.filter(l=>paid(l.id)<l.total).length}}
function status(l){return paid(l.id)>=l.total?"PAGADO":new Date(l.end+"T23:59:59")<new Date()?"ATRASADO":"ACTIVO"}
function render(){
 const d=totals("DOP"),u=totals("USD");
 $("totalDue").textContent=`${money(d.due,"DOP")}  ·  ${money(u.due,"USD")}`;
 $("capital").textContent=`${money(d.capital,"DOP")} / ${money(u.capital,"USD")}`;
 $("interest").textContent=`${money(d.interest,"DOP")} / ${money(u.interest,"USD")}`;
 $("clientsCount").textContent=db.clients.length;
 $("activeCount").textContent=d.active+u.active;
 $("lateCount").textContent=db.loans.filter(l=>status(l)==="ATRASADO").length+" atrasados";
 $("clientsList").innerHTML=db.clients.length?db.clients.map(c=>`<div class="listitem"><div><b>${esc(c.name)}</b><div class="muted">${esc(c.phone||"Sin teléfono")} · ${esc(c.identity||"Sin ID")}</div></div><button class="danger smallbtn" data-delete-client="${c.id}">Eliminar</button></div>`).join(""):'<div class="empty">No hay clientes todavía.</div>';
 $("loanClient").innerHTML='<option value="">Seleccionar cliente</option>'+db.clients.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("");
 $("paymentLoan").innerHTML='<option value="">Seleccionar préstamo</option>'+db.loans.filter(l=>paid(l.id)<l.total).map(l=>`<option value="${l.id}">${esc(clientName(l.clientId))} · ${money(l.total-paid(l.id),l.currency)} pendiente</option>`).join("");
 $("loansList").innerHTML=db.loans.length?db.loans.slice().reverse().map(l=>`<div class="listitem"><div><b>${esc(clientName(l.clientId))}</b> <span class="pill ${status(l)==="ATRASADO"?"red":status(l)==="PAGADO"?"green":""}">${status(l)}</span><div class="muted">${money(l.principal,l.currency)} · ${l.rate}% semanal · ${l.weeks} semanas</div><div class="muted">Total ${money(l.total,l.currency)} · Saldo ${money(Math.max(0,l.total-paid(l.id)),l.currency)}</div></div><button class="secondary smallbtn" data-loan-detail="${l.id}">Ver</button></div>`).join(""):'<div class="empty">No hay préstamos registrados.</div>';
 $("paymentsList").innerHTML=db.payments.length?db.payments.slice().reverse().map(p=>{let l=db.loans.find(x=>x.id===p.loanId);return `<div class="listitem"><div><b>${money(p.amount,p.currency)}</b><div class="muted">${esc(clientName(l?.clientId))} · ${fmt(p.date)} · ${esc(p.method)}</div></div><span class="pill green">Recibido</span></div>`}).join(""):'<div class="empty">No hay cobros registrados.</div>';
 $("recent").innerHTML=db.payments.length?db.payments.slice(-4).reverse().map(p=>`<div class="listitem"><div><b>${money(p.amount,p.currency)}</b><div class="muted">${fmt(p.date)} · ${esc(clientName(db.loans.find(l=>l.id===p.loanId)?.clientId))}</div></div></div>`).join(""):'Todavía no hay movimientos.';
 $("reportSummary").innerHTML=`<p><b>Clientes:</b> ${db.clients.length}</p><p><b>Préstamos:</b> ${db.loans.length}</p><p><b>Cobros:</b> ${db.payments.length}</p><p><b>Saldo RD$:</b> ${money(d.due,"DOP")}</p><p><b>Saldo US$:</b> ${money(u.due,"USD")}</p>`;
}
function show(tab){document.querySelectorAll("main>section").forEach(s=>s.classList.add("hidden"));$(tab).classList.remove("hidden");document.querySelectorAll(".tab").forEach(b=>b.classList.toggle("active",b.dataset.tab===tab));}
document.querySelectorAll(".tab").forEach(b=>b.addEventListener("click",()=>show(b.dataset.tab)));
$("clientForm").addEventListener("submit",e=>{e.preventDefault();let f=new FormData(e.target);db.clients.push({id:crypto.randomUUID(),name:f.get("name").trim(),identity:f.get("identity"),phone:f.get("phone"),address:f.get("address"),reference:f.get("reference")});e.target.reset();save();alert("Cliente guardado.");});
$("loanForm").addEventListener("input",previewLoan);
function previewLoan(){let f=new FormData($("loanForm")),p=Number(f.get("principal")),r=Number(f.get("rate")),w=Number(f.get("weeks"));if(p>0&&w>0&&r>=0){let i=p*r/100*w,t=p+i;$("loanPreview").textContent=`Interés total estimado: ${t?money(i,f.get("currency")):"—"} · Total a cobrar: ${money(t,f.get("currency"))} · Cuota semanal equivalente: ${money(t/w,f.get("currency"))}`}}
$("loanForm").addEventListener("submit",e=>{e.preventDefault();let f=new FormData(e.target),p=+f.get("principal"),r=+f.get("rate"),w=+f.get("weeks");if(!db.clients.some(c=>c.id===f.get("clientId")))return alert("Selecciona un cliente.");let start=f.get("start"),endDate=new Date(start+"T12:00:00");endDate.setDate(endDate.getDate()+w*7);let interest=p*r/100*w,total=p+interest;db.loans.push({id:crypto.randomUUID(),clientId:f.get("clientId"),currency:f.get("currency"),principal:p,rate:r,weeks:w,interest,total,start,end:endDate.toISOString().slice(0,10),frequency:f.get("frequency"),notes:f.get("notes")});e.target.reset();$("loanForm").elements.start.value=today();save();alert("Préstamo creado. Recuerda registrar el calendario de cobro acordado con el cliente.");});
$("paymentLoan").addEventListener("change",()=>{let l=db.loans.find(x=>x.id===$("paymentLoan").value);if(l)$("paymentCurrency").value=l.currency});
$("paymentForm").addEventListener("submit",e=>{e.preventDefault();let f=new FormData(e.target),l=db.loans.find(x=>x.id===f.get("loanId")),amount=+f.get("amount");if(!l)return alert("Selecciona un préstamo.");if(f.get("currency")!==l.currency)return alert("La moneda del cobro debe coincidir con la del préstamo.");if(amount>Math.max(0,l.total-paid(l.id))+0.00001)return alert("El monto supera el saldo pendiente.");db.payments.push({id:crypto.randomUUID(),loanId:l.id,date:f.get("date"),amount,currency:l.currency,method:f.get("method"),reference:f.get("reference")});e.target.reset();$("paymentForm").elements.date.value=today();save();alert("Cobro registrado.");});
document.addEventListener("click",e=>{let id=e.target.dataset.deleteClient;if(id){if(db.loans.some(l=>l.clientId===id))return alert("No puedes eliminar un cliente con préstamos registrados.");if(confirm("¿Eliminar este cliente?")){db.clients=db.clients.filter(c=>c.id!==id);save()}}let lid=e.target.dataset.loanDetail;if(lid){let l=db.loans.find(x=>x.id===lid);alert(`Préstamo\nCliente: ${clientName(l.clientId)}\nCapital: ${money(l.principal,l.currency)}\nInterés: ${money(l.interest,l.currency)}\nTotal: ${money(l.total,l.currency)}\nCobrado: ${money(paid(l.id),l.currency)}\nSaldo: ${money(Math.max(0,l.total-paid(l.id)),l.currency)}\nVence: ${fmt(l.end)}`)}});
$("exportCsv").onclick=()=>{let rows=[["tipo","id","cliente","fecha","moneda","capital/monto","interes","total","tasa_semanal","semanas","estado"]];db.loans.forEach(l=>rows.push(["prestamo",l.id,clientName(l.clientId),l.start,l.currency,l.principal,l.interest,l.total,l.rate,l.weeks,status(l)]));db.payments.forEach(p=>rows.push(["cobro",p.id,"",p.date,p.currency,p.amount,"","","","",""]));let csv=rows.map(r=>r.map(x=>'"'+String(x??"").replaceAll('"','""')+'"').join(",")).join("\n");download(csv,"control-cash.csv","text/csv;charset=utf-8")};
$("backup").onclick=()=>download(JSON.stringify(db,null,2),"respaldo-control-cash.json","application/json");
$("restore").onchange=async e=>{try{let x=JSON.parse(await e.target.files[0].text());if(!Array.isArray(x.clients)||!Array.isArray(x.loans)||!Array.isArray(x.payments))throw Error();if(confirm("Esto reemplazará los datos actuales de este dispositivo. ¿Continuar?")){db=x;save();alert("Respaldo importado.")}}catch{alert("Archivo de respaldo no válido.")}e.target.value=""};
function download(content,name,type){let a=document.createElement("a"),u=URL.createObjectURL(new Blob([content],{type}));a.href=u;a.download=name;a.click();URL.revokeObjectURL(u)}
$("loanForm").elements.start.value=today();$("paymentForm").elements.date.value=today();render();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
// ACCESO PRIVADO Y SINCRONIZACIÓN CON FIREBASE

document.body.insertAdjacentHTML("afterbegin", `
<div id="loginPanel" style="max-width:400px;margin:60px auto;padding:25px;background:white;border-radius:15px;font-family:Arial">
  <h2 style="text-align:center">PRÉSTAMOS PRO</h2>
  <p style="text-align:center">Acceso de administrador</p>
  <form id="loginForm">
    <input id="loginEmail" type="email" placeholder="Correo electrónico" required
      style="width:100%;padding:13px;margin:8px 0;box-sizing:border-box">
    <input id="loginPassword" type="password" placeholder="Contraseña" required
      style="width:100%;padding:13px;margin:8px 0;box-sizing:border-box">
    <button type="submit" style="width:100%;padding:14px;margin-top:10px">
      Iniciar sesión
    </button>
  </form>
  <p id="loginMessage" style="color:#b00020"></p>
</div>
`);

const loginPanel = $("loginPanel");
const loginForm = $("loginForm");
const appHeader = document.querySelector("header");
const appMain = document.querySelector("main");

function showLogin(message=""){
  cloudReady=false;
  loginPanel.style.display="block";
  if(appHeader) appHeader.style.display="none";
  if(appMain) appMain.style.display="none";
  $("loginMessage").textContent=message;
}

function showApp(){
  loginPanel.style.display="none";
  if(appHeader) appHeader.style.display="";
  if(appMain) appMain.style.display="";
  render();
}

loginForm.addEventListener("submit",async e=>{
  e.preventDefault();
  $("loginMessage").textContent="Verificando acceso...";
  try{
    await signInWithEmailAndPassword(
      auth,
      $("loginEmail").value.trim(),
      $("loginPassword").value
    );
  }catch(error){
    $("loginMessage").textContent="No se pudo iniciar sesión. Revisa tu correo y contraseña.";
  }
});

onAuthStateChanged(auth,async user=>{
  if(!user){
    showLogin();
    return;
  }

  cloudReady=false;
  $("loginMessage").textContent="Cargando tus datos...";

  try{
    const ref=doc(cloudDB,"users",user.uid,"data","main");
    const snapshot=await getDoc(ref);

    if(snapshot.exists()){
      db=snapshot.data();
    }else{
      await setDoc(ref,db);
    }

    localStorage.setItem(KEY,JSON.stringify(db));
    cloudReady=true;
    showApp();
  }catch(error){
    showLogin("Error de conexión con Firebase: "+error.message);
  }
});
