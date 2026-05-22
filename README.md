# NOCTIS EA — Gold Edition Web Application

> Premium automated trading system for Deriv synthetic indices (BOOM 1000 & CRASH 1000)

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Custom CSS (no Tailwind) — premium gold dark theme |
| State | React Context + useReducer |
| Market Data | Deriv WebSocket API (wss://ws.binaryws.com) |
| Backend | Node.js + Express + ws |
| WhatsApp | whatsapp-web.js (Puppeteer headless) |
| Notifications | Browser Notification API |

---

## Project Structure

```
noctis-ea/
├── index.html
├── vite.config.js
├── package.json
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── styles.css
│   ├── context/
│   │   └── AppContext.jsx        ← Global state, trading engine, WS
│   └── components/
│       ├── LandingPage.jsx       ← / route, particle animation, CTA
│       ├── Dashboard.jsx         ← /dashboard shell + routing
│       ├── layout/
│       │   ├── Header.jsx        ← Fixed top bar, status badges
│       │   ├── NavDrawer.jsx     ← Slide-out nav (Account/WA/Settings)
│       │   ├── DashboardTabBar.jsx ← Signals ↔ AutoTrader toggle
│       │   ├── StatusRibbon.jsx  ← Fixed bottom POS/P&L/BAL tracker
│       │   └── MarginErrorBanner.jsx ← ABOVE LIMIT alert
│       ├── signals/
│       │   ├── SignalsView.jsx   ← AO/AC charts, signal badge, params
│       │   └── OscillatorChart.jsx ← Canvas histogram renderer
│       ├── autotrader/
│       │   └── AutoTraderView.jsx ← START/STOP engine, candle counter
│       ├── account/
│       │   └── AccountView.jsx  ← Credential form, profiles grid
│       ├── whatsapp/
│       │   └── WhatsAppView.jsx ← QR stream, WA status
│       └── history/
│           └── HistoryView.jsx  ← Timeline, daily/weekly P&L
└── backend/
    └── server.js                ← Express + WS bridge + WhatsApp
```

---

## Quick Start

### 1. Frontend (React Dev Server)

```bash
cd noctis-ea
npm install
npm run dev
# → http://localhost:5173
```

### 2. Backend (Node.js)

```bash
cd noctis-ea/backend
npm install express ws cors whatsapp-web.js qrcode
node server.js
# → http://localhost:3001
```

### 3. Full Stack (Concurrent)

```bash
npm install concurrently
npm start
```

---

## Trading Engine Logic

### Signal Detection (AppContext.jsx)

**Boom 1000 — SELL signal:**
```
AO < 0 AND AC < 0 (both below zero line)
```

**Crash 1000 — BUY signal:**
```
AO > 0 AND AC > 0 (both above zero line)
```

### Candle Execution Sequence

```
Candle 0 → Signal detected (AO + AC cross zero simultaneously)
Candle 1 → Confirmation phase 1 (wait)
Candle 2 → Confirmation phase 2 (wait)
Candle 3 → Confirmation phase 3 (wait)
Candle 4 → ENTRY: Orders fired at open tick of 4th candle
Candle 5-8 → Holding period (4 trailing candles)
Candle 9 → FORCED LIQUIDATION at close tick of 5th holding candle
```

### Indicator Formulas

**Awesome Oscillator (AO):**
```
AO = SMA(median_price, 5) − SMA(median_price, 34)
median_price = (high + low) / 2
```

**Accelerator Oscillator (AC):**
```
AO_series = AO values over last N candles
AC = AO − SMA(AO_series, 5)
```

### Margin Guard

```javascript
// Triggered before order execution
if (balance < 10)  → block if margin > 50% of balance
if (balance < 50)  → block if positionCount > 5
// Returns: ABOVE LIMIT exception banner on frontend
```

---

## WhatsApp Relay Messages

| Event | Message |
|---|---|
| Trade Entry | `SELL BOOM1000 \| TP 5 CANDLES` |
| Trade Exit | `TRADE COMPLETE. NOX ❄️` |

Setup:
1. Start backend → QR appears in `/dashboard/whatsapp`
2. Scan QR with WhatsApp mobile
3. Name your target group to include "noctis" (case-insensitive)
4. Alerts relay automatically on every trade lifecycle event

---

## Deriv API Connection

- WebSocket: `wss://ws.binaryws.com/websockets/v3?app_id=1089`
- Assets: `BOOM1000`, `CRASH1000`
- Timeframe: M1 (granularity=60)
- Auth: Deriv API token (OAuth token from your Deriv account)

Get your API token at: https://app.deriv.com/account/api-token

---

## Design System

| Token | Value |
|---|---|
| Background | `#0A0A0C` |
| Surface | `#0F0F12` |
| Card | `#14141A` |
| Gold Primary | `#D4AF37` |
| Gold Secondary | `#AA7C11` |
| Font Display | Cinzel (serif) |
| Font Body | Rajdhani (sans) |
| Font Mono | Share Tech Mono |

---

## Deployment (Production)

```bash
# Build frontend
npm run build

# Serve with backend
node backend/server.js
# Backend serves dist/ as static files + API on same port (3001)
```

For VPS deployment (Ubuntu):
```bash
npm install -g pm2
pm2 start backend/server.js --name noctis-ea
pm2 save && pm2 startup
```

---

**NOCTIS EA v2.4.1 · ITRADE XXIV**
