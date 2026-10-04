const express = require("express");
const path = require("path");
const Database = require("better-sqlite3");
const QRCode = require("qrcode");

const app = express();
const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;
const ADMIN_PIN = process.env.ADMIN_PIN || "1234";

const db = new Database(path.join(__dirname, "data", "bisoke.db"));
db.pragma("journal_mode = WAL");

db.exec(`
CREATE TABLE IF NOT EXISTS services (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  description TEXT DEFAULT '',
  active INTEGER DEFAULT 1
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  service_id INTEGER NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  payment_status TEXT NOT NULL DEFAULT 'UNPAID',
  payment_reference TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(service_id) REFERENCES services(id)
);
`);

const count = db.prepare("SELECT COUNT(*) c FROM services").get().c;
if (!count) {
  const seed = db.prepare("INSERT INTO services (name, price, description) VALUES (?, ?, ?)");
  [
    ["Printing B/W", 50, "Black & white printing per page"],
    ["Printing Color", 200, "Color printing per page"],
    ["Photocopy", 50, "Photocopy per page"],
    ["Scanning", 200, "Document scanning"],
    ["Passport Photo", 1000, "Passport-size photo"],
    ["CV Preparation", 2000, "Professional CV preparation"],
    ["Typing", 500, "Typing service per page"],
    ["Irembo / Online Service", 1000, "Online application assistance"]
  ].forEach(x => seed.run(...x));
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/services", (req,res) => {
  res.json(db.prepare("SELECT * FROM services WHERE active=1 ORDER BY id").all());
});

app.post("/api/orders", (req,res) => {
  const {customer_name, phone, service_id, quantity=1, notes=""} = req.body;
  if (!customer_name || !phone || !service_id) return res.status(400).json({error:"Missing required fields"});
  const service = db.prepare("SELECT * FROM services WHERE id=? AND active=1").get(service_id);
  if (!service) return res.status(404).json({error:"Service not found"});
  const qty = Math.max(1, Number(quantity)||1);
  const total = service.price * qty;
  const result = db.prepare(`
    INSERT INTO orders (customer_name,phone,service_id,quantity,total,notes)
    VALUES (?,?,?,?,?,?)
  `).run(customer_name.trim(), phone.trim(), service_id, qty, total, notes.trim());
  res.json({order_id:Number(result.lastInsertRowid), total, payment_status:"UNPAID"});
});

// Demo payment endpoint. Replace this with MTN MoMo/Airtel Money or a payment gateway.
app.post("/api/payments/demo", (req,res) => {
  const {order_id} = req.body;
  const order = db.prepare("SELECT * FROM orders WHERE id=?").get(order_id);
  if (!order) return res.status(404).json({error:"Order not found"});
  const ref = "DEMO-" + Date.now();
  db.prepare("UPDATE orders SET payment_status='PAID', status='NEW', payment_reference=? WHERE id=?").run(ref, order_id);
  res.json({success:true, reference:ref, message:"Payment confirmed (demo mode)"});
});

app.get("/api/orders/:id", (req,res) => {
  const o = db.prepare(`
    SELECT o.*, s.name service_name FROM orders o
    JOIN services s ON s.id=o.service_id WHERE o.id=?
  `).get(req.params.id);
  if (!o) return res.status(404).json({error:"Not found"});
  res.json(o);
});

app.post("/api/admin/login", (req,res) => {
  if (String(req.body.pin || "") !== ADMIN_PIN) return res.status(401).json({error:"Invalid PIN"});
  res.json({ok:true});
});

app.get("/api/admin/orders", (req,res) => {
  if (String(req.query.pin || "") !== ADMIN_PIN) return res.status(401).json({error:"Unauthorized"});
  const rows = db.prepare(`
    SELECT o.*, s.name service_name
    FROM orders o JOIN services s ON s.id=o.service_id
    ORDER BY o.id DESC LIMIT 200
  `).all();
  res.json(rows);
});

app.get("/api/admin/stats", (req,res) => {
  if (String(req.query.pin || "") !== ADMIN_PIN) return res.status(401).json({error:"Unauthorized"});
  const total = db.prepare("SELECT COALESCE(SUM(total),0) n FROM orders WHERE payment_status='PAID'").get().n;
  const today = db.prepare(`
    SELECT COALESCE(SUM(total),0) n FROM orders
    WHERE payment_status='PAID' AND date(created_at)=date('now','localtime')
  `).get().n;
  const orders = db.prepare("SELECT COUNT(*) n FROM orders").get().n;
  const pending = db.prepare("SELECT COUNT(*) n FROM orders WHERE status IN ('NEW','PENDING')").get().n;
  res.json({total, today, orders, pending});
});

app.post("/api/admin/orders/:id/status", (req,res) => {
  if (String(req.query.pin || "") !== ADMIN_PIN) return res.status(401).json({error:"Unauthorized"});
  const allowed = ["NEW","PROCESSING","READY","COMPLETED","CANCELLED"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({error:"Invalid status"});
  db.prepare("UPDATE orders SET status=? WHERE id=?").run(req.body.status, req.params.id);
  res.json({ok:true});
});

app.get("/api/qr", async (req,res) => {
  const target = `${BASE_URL}/`;
  try {
    const png = await QRCode.toDataURL(target, {width:800, margin:2});
    res.json({url:target, dataUrl:png});
  } catch(e) { res.status(500).json({error:e.message}); }
});

app.get("/admin", (req,res) => res.sendFile(path.join(__dirname,"public","admin.html")));
app.get("*splat", (req,res) => res.sendFile(path.join(__dirname,"public","index.html")));

app.listen(PORT, () => console.log(`Bisoke app running at ${BASE_URL}`));