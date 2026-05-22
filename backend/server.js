/**
 * NOCTIS EA — Node.js Backend
 * Handles: WhatsApp Web relay, Deriv API proxy, WebSocket bridge
 * Run: node server.js
 */

const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const cors = require("cors");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: "/ws" });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "dist")));

// ─── State ─────────────────────────────────────────────────────────
let waClient = null;
let waStatus = "disconnected";
let waQR = null;
let targetGroupId = null;
const connectedClients = new Set();

// ─── WhatsApp Integration ───────────────────────────────────────────
let Client, LocalAuth;
try {
  ({ Client, LocalAuth } = require("whatsapp-web.js"));
  qrcode = require("qrcode");
  initWhatsApp();
} catch (e) {
  console.warn("whatsapp-web.js not installed. Run: npm install whatsapp-web.js qrcode");
}

function initWhatsApp() {
  waClient = new Client({
    authStrategy: new LocalAuth({ clientId: "noctis-ea" }),
    puppeteer: { headless: true, args: ["--no-sandbox", "--disable-setuid-sandbox"] },
  });

  waClient.on("qr", async (qr) => {
    waStatus = "disconnected";
    try {
      waQR = await qrcode.toDataURL(qr);
    } catch (e) {
      waQR = null;
    }
    broadcastToClients({ type: "WA_QR", qr: waQR, status: waStatus });
  });

  waClient.on("ready", () => {
    waStatus = "connected";
    waQR = null;
    broadcastToClients({ type: "WA_STATUS", status: "connected" });
    console.log("WhatsApp Web: CONNECTED");
  });

  waClient.on("disconnected", () => {
    waStatus = "disconnected";
    broadcastToClients({ type: "WA_STATUS", status: "disconnected" });
    setTimeout(initWhatsApp, 5000);
  });

  waClient.initialize();
}

async function sendWhatsAppMessage(message) {
  if (!waClient || waStatus !== "connected") return false;
  try {
    const chats = await waClient.getChats();
    const group = chats.find(c => c.isGroup && (c.name.toLowerCase().includes("noctis") || c.id._serialized === targetGroupId));
    if (group) {
      await group.sendMessage(message);
      return true;
    }
    return false;
  } catch (e) {
    console.error("WA send error:", e);
    return false;
  }
}

// ─── WebSocket Bridge ───────────────────────────────────────────────
wss.on("connection", (ws) => {
  connectedClients.add(ws);
  ws.send(JSON.stringify({ type: "WA_STATUS", status: waStatus, qr: waQR }));
  ws.on("close", () => connectedClients.delete(ws));
  ws.on("message", async (msg) => {
    try {
      const data = JSON.parse(msg);
      if (data.type === "SEND_WA" && data.message) {
        const sent = await sendWhatsAppMessage(data.message);
        ws.send(JSON.stringify({ type: "WA_SENT", success: sent }));
      }
      if (data.type === "SET_GROUP" && data.groupId) {
        targetGroupId = data.groupId;
      }
    } catch (e) {}
  });
});

function broadcastToClients(data) {
  const msg = JSON.stringify(data);
  connectedClients.forEach(c => { if (c.readyState === WebSocket.OPEN) c.send(msg); });
}

// ─── REST Endpoints ──────────────────────────────────────────────────
app.get("/api/whatsapp/qr", (req, res) => {
  res.json({ qr: waQR, status: waStatus });
});

app.get("/api/whatsapp/status", (req, res) => {
  res.json({ status: waStatus });
});

app.post("/api/whatsapp/send", async (req, res) => {
  const { message } = req.body;
  const sent = await sendWhatsAppMessage(message);
  res.json({ sent });
});

app.post("/api/trade/entry", async (req, res) => {
  const { asset, direction, lotSize } = req.body;
  const symbol = asset === "BOOM_1000" ? "BOOM1000" : "CRASH1000";
  const msg = `${direction} ${symbol} | TP 5 CANDLES`;
  await sendWhatsAppMessage(msg);
  broadcastToClients({ type: "TRADE_ENTRY", asset, direction, lotSize, time: new Date() });
  res.json({ ok: true });
});

app.post("/api/trade/exit", async (req, res) => {
  const { pnl } = req.body;
  const msg = `TRADE COMPLETE. NOX ❄️\nP&L: ${pnl >= 0 ? "+" : ""}$${parseFloat(pnl || 0).toFixed(2)}`;
  await sendWhatsAppMessage(msg);
  broadcastToClients({ type: "TRADE_EXIT", pnl, time: new Date() });
  res.json({ ok: true });
});

// Catch-all for SPA routing
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

// ─── Start ───────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`NOCTIS EA Backend running on http://localhost:${PORT}`);
  console.log(`WebSocket bridge: ws://localhost:${PORT}/ws`);
});
