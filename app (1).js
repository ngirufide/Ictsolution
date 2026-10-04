let services=[];
const fmt=n=>Number(n).toLocaleString()+" RWF";
async function init(){
 services=await (await fetch("/api/services")).json();
 const box=document.getElementById("services"), sel=document.getElementById("service");
 box.innerHTML=services.map(s=>`<div class="service" onclick="pick(${s.id})"><h3>${esc(s.name)}</h3><p>${esc(s.description)}</p><b>${fmt(s.price)}</b></div>`).join("");
 sel.innerHTML='<option value="">Select a service</option>'+services.map(s=>`<option value="${s.id}">${esc(s.name)} — ${fmt(s.price)}</option>`).join("");
 sel.addEventListener("change",update); document.getElementById("qty").addEventListener("input",update);
}
function pick(id){service.value=id;update();document.getElementById("orderForm").scrollIntoView({behavior:"smooth"})}
function update(){const s=services.find(x=>x.id==service.value);total.textContent=fmt(s?(s.price*(Number(qty.value)||1)):0)}
document.getElementById("orderForm").addEventListener("submit",async e=>{
 e.preventDefault();
 const payload={customer_name:name.value,phone:phone.value,service_id:Number(service.value),quantity:Number(qty.value),notes:notes.value};
 const r=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
 const o=await r.json(); if(!r.ok){result.textContent=o.error;return}
 payment.classList.remove("hidden");
 payment.innerHTML=`<div class="paybox"><h3>Order #${o.order_id}</h3><p>Amount to pay: <b>${fmt(o.total)}</b></p><button onclick="demoPay(${o.order_id})">Pay now (demo)</button><small>Real MTN/Airtel payment is connected after your merchant/API credentials are provided.</small></div>`;
});
async function demoPay(id){
 const r=await fetch("/api/payments/demo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({order_id:id})});
 const x=await r.json(); result.innerHTML=`<div class="success">✅ ${x.message}<br>Reference: ${x.reference}<br>Your order has been sent to Bisoke.</div>`;
 payment.classList.add("hidden");
}
function esc(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[m]))}
init();