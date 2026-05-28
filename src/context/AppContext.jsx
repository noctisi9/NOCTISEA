import React from 'react';
import { createContext, useContext, useReducer, useRef, useCallback } from 'react';

const AppContext = createContext(null);

const initialState = {
  connected: false,
  environment: "DEMO",
  activeAsset: "BOOM_1000",
  currentView: "signals",
  drawerOpen: false,
  account: { appId: "", token: "", accountId: "", balance: 0, currency: "USD", username: "" },
  signals: { ao: 0, ac: 0, direction: null },
  candles: [],
  currentPrice: 0,
  positions: [],
  pnl: 0,
  autoTraderActive: false,
  lotSize: 1,
  positionCount: 1,
  candle: { count: 0, phase: "waiting" },
  history: [],
  notifications: [],
  whatsappStatus: "disconnected",
  qrCode: null,
  marginError: null,
  connectError: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_CONNECTED":      return { ...state, connected: action.payload };
    case "SET_ENVIRONMENT":    return { ...state, environment: action.payload };
    case "SET_ASSET":          return { ...state, activeAsset: action.payload, signals: { ao: 0, ac: 0, direction: null }, candles: [], currentPrice: 0 };
    case "SET_VIEW":           return { ...state, currentView: action.payload };
    case "TOGGLE_DRAWER":      return { ...state, drawerOpen: !state.drawerOpen };
    case "CLOSE_DRAWER":       return { ...state, drawerOpen: false };
    case "SET_ACCOUNT":        return { ...state, account: { ...state.account, ...action.payload } };
    case "SET_SIGNALS":        return { ...state, signals: action.payload };
    case "SET_CANDLES":        return { ...state, candles: action.payload };
    case "SET_PRICE":          return { ...state, currentPrice: action.payload };
    case "SET_POSITIONS":      return { ...state, positions: action.payload };
    case "ADD_POSITION":       return { ...state, positions: [...state.positions, action.payload] };
    case "SET_PNL":            return { ...state, pnl: action.payload };
    case "SET_AUTOTRADER":     return { ...state, autoTraderActive: action.payload };
    case "SET_LOTSIZE":        return { ...state, lotSize: action.payload };
    case "SET_POSITION_COUNT": return { ...state, positionCount: action.payload };
    case "SET_CANDLE":         return { ...state, candle: action.payload };
    case "ADD_HISTORY":        return { ...state, history: [action.payload, ...state.history] };
    case "ADD_NOTIFICATION":   return { ...state, notifications: [action.payload, ...state.notifications].slice(0, 50) };
    case "SET_WHATSAPP":       return { ...state, whatsappStatus: action.payload };
    case "SET_QR":             return { ...state, qrCode: action.payload };
    case "SET_MARGIN_ERROR":   return { ...state, marginError: action.payload };
    case "CLEAR_MARGIN_ERROR": return { ...state, marginError: null };
    case "SET_CONNECT_ERROR":  return { ...state, connectError: action.payload };
    case "CLEAR_CONNECT_ERROR":return { ...state, connectError: null };
    default: return state;
  }
}

const SYMBOL_MAP = {
  BOOM_1000:  "BOOM1000",
  CRASH_1000: "CRASH1000",
};

// Public WebSocket — no auth needed for market data
const PUBLIC_WS_URL = "wss://api.derivws.com/trading/v1/options/ws/public";

export function AppProvider({ children, navigate }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const wsRef           = useRef(null);
  const candleBufferRef = useRef([]);
  const autoStateRef    = useRef({ triggered: false, candlePhase: 0, entryPrice: 0, asset: "", direction: "" });
  const stateRef        = useRef(state);
  const credRef         = useRef({ appId: "", token: "", accountId: "" });
  stateRef.current      = state;

  // ── Notifications ──────────────────────────────────────────
  const requestNotificationPermission = () => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const pushNotification = useCallback((title, message) => {
    dispatch({ type: "ADD_NOTIFICATION", payload: { id: Date.now(), title, message, time: new Date() } });
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body: message });
    }
  }, []);

  // ── Indicators ─────────────────────────────────────────────
  const computeAO = (candles) => {
    if (candles.length < 34) return 0;
    const med = (c) => (parseFloat(c.high) + parseFloat(c.low)) / 2;
    const sma5  = candles.slice(-5).reduce((s, c) => s + med(c), 0) / 5;
    const sma34 = candles.slice(-34).reduce((s, c) => s + med(c), 0) / 34;
    return sma5 - sma34;
  };

  const computeAC = (candles) => {
    if (candles.length < 40) return 0;
    const aoVals = candles.slice(-10).map((_, i) =>
      computeAO(candles.slice(0, candles.length - 9 + i + 1))
    );
    const ao   = aoVals[aoVals.length - 1];
    const sma5 = aoVals.slice(-5).reduce((s, v) => s + v, 0) / 5;
    return ao - sma5;
  };

  const updateIndicators = useCallback(() => {
    const buf = candleBufferRef.current;
    if (buf.length < 34) return;
    const ao    = computeAO(buf);
    const ac    = computeAC(buf);
    const asset = stateRef.current.activeAsset;
    let direction = null;
    if (asset === "BOOM_1000"  && ao < 0 && ac < 0) direction = "SELL";
    if (asset === "CRASH_1000" && ao > 0 && ac > 0) direction = "BUY";
    dispatch({ type: "SET_SIGNALS", payload: { ao, ac, direction } });
    dispatch({ type: "SET_CANDLES", payload: [...buf.slice(-80)] });
  }, []);

  // ── Margin ─────────────────────────────────────────────────
  const checkMarginSafety = (lot, count, balance) => {
    if (!balance || balance <= 0) return false;
    if (balance < 10  && count > 2)  return true;
    if (balance < 50  && count > 5)  return true;
    if (balance < 100 && count > 20) return true;
    return (lot * count * 50) > balance;
  };

  // ── WS send ────────────────────────────────────────────────
  const wsSend = useCallback((payload) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    }
  }, []);

  // ── Subscribe to asset ─────────────────────────────────────
  const GRANULARITY_MAP = { M1: 60, M5: 300, M15: 900, M30: 1800, H1: 3600, H4: 14400, D1: 86400 };
  const subscribeToAsset = useCallback((asset, tf = "M1") => {
    const symbol = SYMBOL_MAP[asset] || "BOOM1000";
    wsSend({ forget_all: "candles" });
    wsSend({ forget_all: "ticks" });
    const gran = GRANULARITY_MAP[tf] || 60;
    wsSend({ ticks_history: symbol, count: 200, end: "latest", style: "candles", granularity: gran, subscribe: 1 });
    wsSend({ ticks: symbol, subscribe: 1 });
  }, [wsSend]);

  // ── Trade entry ────────────────────────────────────────────
  const executeEntry = useCallback(() => {
    const { account, lotSize, positionCount, activeAsset } = stateRef.current;
    if (checkMarginSafety(lotSize, positionCount, account.balance)) {
      dispatch({ type: "SET_MARGIN_ERROR", payload: `ABOVE LIMIT: ${positionCount} positions exceeds safe margin for $${account.balance} account.` });
      pushNotification("Margin Guard", "Trade blocked — ABOVE LIMIT");
      return;
    }
    const direction    = activeAsset === "BOOM_1000" ? "SELL" : "BUY";
    const symbol       = SYMBOL_MAP[activeAsset];
    const contractType = direction === "SELL" ? "PUT" : "CALL";
    pushNotification("Trade Entry", `${direction} ${symbol} | TP 5 CANDLES`);
    for (let i = 0; i < positionCount; i++) {
      wsSend({ proposal: 1, amount: lotSize, basis: "stake", contract_type: contractType, currency: account.currency || "USD", duration: 5, duration_unit: "m", symbol });
    }
    autoStateRef.current.entryPrice = stateRef.current.currentPrice;
    autoStateRef.current.asset = activeAsset;
    autoStateRef.current.direction = direction;
    dispatch({ type: "ADD_POSITION", payload: { id: Date.now(), asset: symbol, direction, lotSize, positionCount, entryTime: new Date(), status: "open" } });
  }, [pushNotification, wsSend]);

  const executeExit = useCallback(() => {
    stateRef.current.positions.forEach(pos => { if (pos.contractId) wsSend({ sell: pos.contractId, price: 0 }); });
    dispatch({ type: "SET_POSITIONS", payload: [] });
    dispatch({ type: "ADD_HISTORY", payload: { id: Date.now(), asset: autoStateRef.current.asset || stateRef.current.activeAsset, direction: autoStateRef.current.direction, entryPrice: autoStateRef.current.entryPrice, exitPrice: stateRef.current.currentPrice, date: new Date(), candles: 5 } });
    pushNotification("Trade Complete", "TRADE COMPLETE. NOX ❄️");
  }, [pushNotification, wsSend]);

  // ── Auto candle sequencing ─────────────────────────────────
  const onNewCandle = useCallback(() => {
    if (!stateRef.current.autoTraderActive) return;
    const buf   = candleBufferRef.current;
    const ao    = computeAO(buf);
    const ac    = computeAC(buf);
    const asset = stateRef.current.activeAsset;
    const auto  = autoStateRef.current;
    const aligned = (asset === "BOOM_1000" && ao < 0 && ac < 0) || (asset === "CRASH_1000" && ao > 0 && ac > 0);

    if (!auto.triggered && aligned) {
      autoStateRef.current = { triggered: true, candlePhase: 1 };
      dispatch({ type: "SET_CANDLE", payload: { count: 1, phase: "confirming" } });
      pushNotification("🔔 NOCTIS SIGNAL", `${asset === "BOOM_1000" ? "▼ SELL BOOM 1000" : "▲ BUY CRASH 1000"} — Signal detected! Waiting 3 candles for entry.`);
    } else if (auto.triggered && auto.candlePhase >= 1 && auto.candlePhase < 3) {
      autoStateRef.current.candlePhase++;
      dispatch({ type: "SET_CANDLE", payload: { count: auto.candlePhase, phase: "confirming" } });
    } else if (auto.triggered && auto.candlePhase === 3) {
      autoStateRef.current.candlePhase = 4;
      dispatch({ type: "SET_CANDLE", payload: { count: 4, phase: "entry" } });
      executeEntry();
    } else if (auto.triggered && auto.candlePhase >= 4 && auto.candlePhase < 8) {
      autoStateRef.current.candlePhase++;
      dispatch({ type: "SET_CANDLE", payload: { count: auto.candlePhase - 3, phase: "holding" } });
    } else if (auto.triggered && auto.candlePhase >= 8) {
      autoStateRef.current = { triggered: false, candlePhase: 0 };
      dispatch({ type: "SET_CANDLE", payload: { count: 0, phase: "waiting" } });
      executeExit();
    }
  }, [executeEntry, executeExit, pushNotification]);

  // ── WS message handler ─────────────────────────────────────
  const handleMessage = useCallback((evt) => {
    try {
      const data = JSON.parse(evt.data);
      if (data.error) {
        dispatch({ type: "SET_CONNECT_ERROR", payload: `${data.error.code}: ${data.error.message}` });
        return;
      }
      switch (data.msg_type) {
        case "balance":
          dispatch({ type: "SET_ACCOUNT", payload: { balance: data.balance.balance, currency: data.balance.currency } });
          break;
        case "candles":
          if (data.candles) {
            candleBufferRef.current = data.candles.map(c => ({ open: c.open, high: c.high, low: c.low, close: c.close, epoch: c.epoch }));
            updateIndicators();
          }
          break;
        case "ohlc": {
          const c   = data.ohlc;
          const buf = candleBufferRef.current;
          const last = buf[buf.length - 1];
          if (last && last.epoch === c.open_time) {
            buf[buf.length - 1] = { open: c.open, high: c.high, low: c.low, close: c.close, epoch: c.open_time };
          } else {
            buf.push({ open: c.open, high: c.high, low: c.low, close: c.close, epoch: c.open_time });
            if (buf.length > 500) buf.shift();
            onNewCandle();
          }
          dispatch({ type: "SET_PRICE", payload: parseFloat(c.close) });
          updateIndicators();
          break;
        }
        case "tick":
          dispatch({ type: "SET_PRICE", payload: parseFloat(data.tick.quote) });
          break;
        case "proposal":
          if (stateRef.current.positions.length > 0 && stateRef.current.autoTraderActive) {
            wsSend({ buy: data.proposal.id, price: data.proposal.ask_price });
          }
          break;
        case "buy":
          if (data.buy) {
            const positions = stateRef.current.positions;
            if (positions.length > 0) {
              const updated = [...positions];
              const idx = updated.findIndex(p => !p.contractId);
              if (idx >= 0) updated[idx] = { ...updated[idx], contractId: data.buy.contract_id };
              dispatch({ type: "SET_POSITIONS", payload: updated });
            }
            wsSend({ proposal_open_contract: 1, contract_id: data.buy.contract_id, subscribe: 1 });
          }
          break;
        case "proposal_open_contract":
          if (data.proposal_open_contract?.profit !== undefined) {
            dispatch({ type: "SET_PNL", payload: data.proposal_open_contract.profit });
          }
          break;
        default: break;
      }
    } catch (e) { console.error("WS parse error:", e); }
  }, [updateIndicators, onNewCandle, wsSend]);

  // ── Connect WebSocket ──────────────────────────────────────
  const connectWS = useCallback((wsUrl, onOpenCallback) => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    ws.onopen    = () => {
      dispatch({ type: "SET_CONNECTED", payload: true });
      dispatch({ type: "CLEAR_CONNECT_ERROR" });
      if (onOpenCallback) onOpenCallback(ws);
    };
    ws.onmessage = handleMessage;
    ws.onclose   = () => {
      dispatch({ type: "SET_CONNECTED", payload: false });
      // Reconnect using stored credentials
      const { appId, token, accountId } = credRef.current;
      setTimeout(() => {
        if (token && accountId) connectDeriv(appId, token, accountId);
        else connectPublic();
      }, 5000);
    };
    ws.onerror = () => {
      dispatch({ type: "SET_CONNECTED", payload: false });
      dispatch({ type: "SET_CONNECT_ERROR", payload: "WebSocket connection failed" });
    };
  }, [handleMessage]);

  // ── Auth connect via OTP ───────────────────────────────────
  // New Deriv API: POST https://api.derivws.com/trading/v1/options/accounts/{accountId}/otp
  // Headers: Authorization: Bearer {token}, Deriv-App-ID: {appId}
  // Returns: { data: { url: "wss://..." } }
  const connectDeriv = useCallback(async (appId, token, accountId) => {
    dispatch({ type: "CLEAR_CONNECT_ERROR" });
    credRef.current = { appId, token, accountId };

    try {
      const res = await fetch(
        `https://api.derivws.com/trading/v1/options/accounts/${accountId}/otp`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Deriv-App-ID": appId,
            "Content-Type": "application/json",
          },
        }
      );

      const json = await res.json();

      if (!res.ok) {
        const msg = json?.errors?.[0]?.message || json?.message || `Error ${res.status}`;
        dispatch({ type: "SET_CONNECT_ERROR", payload: msg });
        return;
      }

      const wsUrl = json?.data?.url;
      if (!wsUrl) {
        dispatch({ type: "SET_CONNECT_ERROR", payload: "No WebSocket URL returned" });
        return;
      }

      // Detect demo vs live from URL
      const isDemo = wsUrl.includes("/demo");
      dispatch({ type: "SET_ENVIRONMENT", payload: isDemo ? "DEMO" : "LIVE" });

      connectWS(wsUrl, () => {
        // Subscribe to balance and asset after connection
        wsSend({ balance: 1, subscribe: 1 });
        subscribeToAsset(stateRef.current.activeAsset);
      });

    } catch (err) {
      dispatch({ type: "SET_CONNECT_ERROR", payload: `Connection failed: ${err.message}` });
    }
  }, [connectWS, wsSend, subscribeToAsset]);

  // ── Public connect — no auth, market data only ─────────────
  const connectPublic = useCallback(() => {
    credRef.current = { appId: "", token: "", accountId: "" };
    dispatch({ type: "CLEAR_CONNECT_ERROR" });
    connectWS(PUBLIC_WS_URL, () => {
      subscribeToAsset(stateRef.current.activeAsset);
    });
  }, [connectWS, subscribeToAsset]);

  return (
    <AppContext.Provider value={{
      state, dispatch,
      connectDeriv, connectPublic,
      subscribeToAsset,
      pushNotification, requestNotificationPermission,
      checkMarginSafety, executeEntry, executeExit,
      navigate,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
