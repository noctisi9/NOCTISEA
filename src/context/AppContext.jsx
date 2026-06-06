import React, { createContext, useContext, useReducer, useRef, useCallback } from 'react';
import { WelfordRollingEngine } from '../engines/WelfordEngine';
import { SyntheticOrderflowMatrix } from '../engines/OrderflowEngine';
import { TickEngine } from '../engines/TickEngine';

const AppContext = createContext(null);

// Load persisted state from localStorage
const loadPersisted = () => {
  try {
    const h = localStorage.getItem("noctis_history");
    const asset = localStorage.getItem("noctis_asset");
    const tf = localStorage.getItem("noctis_tf");
    return {
      history: h ? JSON.parse(h) : [],
      activeAsset: asset || "BOOM_1000",
      activeTf: tf || "M1",
    };
  } catch { return { history: [], activeAsset: "BOOM_1000", activeTf: "M1" }; }
};
const _persisted = loadPersisted();

const initialState = {
  connected: false,
  environment: "DEMO",
  activeAsset: _persisted.activeAsset,
  activeTf: _persisted.activeTf,
  currentView: "trading",
  drawerOpen: false,
  account: { token: "", balance: 0, currency: "USD", username: "" },
  signals: {
    ao: 0, ac: 0,
    direction: null,     // final fused signal
    e1Signal: null,      // AO/AC signal
    ofSignal: null,      // orderflow signal
    tickSignal: null,    // tick engine signal
    spikeWarning: false, // welford compression
    confidence: 0,
    reason: "",
    sigmaMean: 0,
  },
  candles: [],
  currentPrice: 0,
  orderflow: { pocLevel: 0, cumulativeDelta: 0, absorptionDetected: false, profile: [], totalVolume: 0 },
  tickStats: { hz: 0, bullTicks: 0, bearTicks: 0, bullPct: 50, bearPct: 50, avgVelocity: 0 },
  welford: { stdDev: 0, mean: 0, compressionWarning: false, sigmaMean: 0 },
  positions: [],
  pnl: 0,
  history: _persisted.history,
  notifications: [],
  marginError: null,
  connectError: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_CONNECTED":       return { ...state, connected: action.payload };
    case "SET_ENVIRONMENT":     return { ...state, environment: action.payload };
    case "SET_ASSET": {
      try { localStorage.setItem("noctis_asset", action.payload); } catch {}
      return { ...state, activeAsset: action.payload, candles: [], currentPrice: 0 };
    }
    case "SET_TF": {
      try { localStorage.setItem("noctis_tf", action.payload); } catch {}
      return { ...state, activeTf: action.payload, candles: [] };
    }
    case "SET_VIEW":            return { ...state, currentView: action.payload };
    case "TOGGLE_DRAWER":       return { ...state, drawerOpen: !state.drawerOpen };
    case "CLOSE_DRAWER":        return { ...state, drawerOpen: false };
    case "SET_ACCOUNT":         return { ...state, account: { ...state.account, ...action.payload } };
    case "SET_SIGNALS":         return { ...state, signals: { ...state.signals, ...action.payload } };
    case "SET_CANDLES":         return { ...state, candles: action.payload };
    case "SET_PRICE":           return { ...state, currentPrice: action.payload };
    case "SET_ORDERFLOW":       return { ...state, orderflow: action.payload };
    case "SET_TICK_STATS":      return { ...state, tickStats: action.payload };
    case "SET_WELFORD":         return { ...state, welford: action.payload };
    case "ADD_HISTORY": {
      const newHistory = [action.payload, ...state.history].slice(0, 500);
      try { localStorage.setItem("noctis_history", JSON.stringify(newHistory)); } catch {}
      return { ...state, history: newHistory };
    }
    case "ADD_NOTIFICATION":    return { ...state, notifications: [action.payload, ...state.notifications].slice(0, 50) };
    case "SET_MARGIN_ERROR":    return { ...state, marginError: action.payload };
    case "CLEAR_MARGIN_ERROR":  return { ...state, marginError: null };
    case "SET_CONNECT_ERROR":   return { ...state, connectError: action.payload };
    case "CLEAR_CONNECT_ERROR": return { ...state, connectError: null };
    default: return state;
  }
}

const SYMBOL_MAP = { BOOM_1000: "BOOM1000", CRASH_1000: "CRASH1000" };
const GRAN_MAP   = { M1:60, M5:300, M15:900, M30:1800, H1:3600, H4:14400, D1:86400 };
const WS_URL     = "wss://ws.binaryws.com/websockets/v3?app_id=1089";

export function AppProvider({ children, navigate }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const wsRef        = useRef(null);
  const bufRef       = useRef([]);
  const stateRef     = useRef(state);
  const tokenRef     = useRef("");
  const fusionRef    = useRef(null);
  stateRef.current   = state;

  // Engine instances
  const welfordRef   = useRef(new WelfordRollingEngine(1000));
  const orderflowRef = useRef(new SyntheticOrderflowMatrix(0.01, 500));
  const tickEngRef   = useRef(new TickEngine());

  // ── Notifications ──────────────────────────────────────
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

  // ── Indicator computation ──────────────────────────────
  const computeAO = (candles) => {
    if (candles.length < 34) return 0;
    const med   = c => (parseFloat(c.high) + parseFloat(c.low)) / 2;
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

  // ── Signal Fusion ──────────────────────────────────────
  const runFusion = useCallback(() => {
    const buf   = bufRef.current;
    if (buf.length < 34) return;

    const ao    = computeAO(buf);
    const ac    = computeAC(buf);
    const asset = stateRef.current.activeAsset;
    const of    = stateRef.current.orderflow;
    const wf    = stateRef.current.welford;
    const ts    = stateRef.current.tickStats;

    // Engine 1: AO + AC zero-line alignment
    let e1Signal = null;
    if (asset === "BOOM_1000"  && ao < 0 && ac < 0) e1Signal = "SELL";
    if (asset === "CRASH_1000" && ao > 0 && ac > 0) e1Signal = "BUY";

    // Engine 2: Orderflow CVD + absorption
    let ofSignal = null;
    if (!of.absorptionDetected) {
      if (of.cumulativeDelta > 10)  ofSignal = "BUY";
      if (of.cumulativeDelta < -10) ofSignal = "SELL";
    }

    // Engine 3: Tick/Welford
    let tickSignal = null;
    const spikeWarning = wf.compressionWarning && ts.hz < 8;
    if (!spikeWarning) {
      const bullBias = (ts.bullTicks || 0) > (ts.bearTicks || 0);
      if (bullBias && ts.hz >= 8)  tickSignal = "BUY";
      if (!bullBias && ts.hz >= 8) tickSignal = "SELL";
    } else {
      tickSignal = "SPIKE WARNING";
    }

    // Confidence calculation
    const agreeing = [e1Signal, ofSignal, tickSignal === "SPIKE WARNING" ? null : tickSignal]
      .filter(s => s !== null && s === e1Signal).length;
    let confidence = 0;
    if (e1Signal) {
      confidence = agreeing >= 3 ? 95
        : agreeing === 2 ? 70
        : 45;
      // Boost if CVD strong and Hz normal
      if (Math.abs(of.cumulativeDelta) > 30 && ts.hz >= 10 && ts.hz <= 18) {
        confidence = Math.min(99, confidence + 10);
      }
    }

    // Final signal — e1 must exist, spike overrides all
    const direction = spikeWarning ? null : (e1Signal || null);

    const prevDir = stateRef.current.signals.direction;
    const prevSpike = stateRef.current.signals.spikeWarning;

    if (direction && direction !== prevDir) {
      pushNotification(
        `🔔 NOCTIS SIGNAL`,
        `${direction === "BUY" ? "▲ BUY" : "▼ SELL"} ${asset.replace("_"," ")} — ${confidence}% confidence`
      );
      // Auto-log signal to history with entry price + estimated exit (5-candle projection)
      const entryPrice = stateRef.current.currentPrice;
      const buf = bufRef.current;
      const last5 = buf.slice(-5);
      const avgMove = last5.length > 1
        ? Math.abs(last5.reduce((s,c,i) => i===0 ? 0 : s + (parseFloat(c.close)-parseFloat(last5[i-1].close)), 0) / Math.max(last5.length-1,1))
        : 0.5;
      const exitPrice = direction === "BUY"
        ? entryPrice + avgMove * 5
        : entryPrice - avgMove * 5;
      dispatch({ type: "ADD_HISTORY", payload: {
        id: Date.now(),
        asset,
        direction,
        entryPrice,
        exitPrice: parseFloat(exitPrice.toFixed(2)),
        date: new Date().toISOString(),
        confidence,
      }});
    }
    if (spikeWarning && !prevSpike) {
      pushNotification("⚡ SPIKE WARNING", `${asset.replace("_"," ")} — Compression detected. Exit positions.`);
    }

    dispatch({ type: "SET_SIGNALS", payload: {
      ao, ac, direction,
      e1Signal, ofSignal, tickSignal,
      spikeWarning, confidence,
      reason: spikeWarning ? "Compression detected" : direction ? `${confidence}% confidence` : "Engines not aligned",
    }});
    dispatch({ type: "SET_CANDLES", payload: [...buf.slice(-100)] });
  }, [pushNotification]);

  // Start fusion polling loop
  const startFusion = useCallback(() => {
    if (fusionRef.current) clearInterval(fusionRef.current);
    fusionRef.current = setInterval(runFusion, 200);
  }, [runFusion]);

  // ── WS send ────────────────────────────────────────────
  const wsSend = useCallback((payload) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  }, []);

  // ── Subscribe ──────────────────────────────────────────
  const subscribeToAsset = useCallback((asset, tf = "M1") => {
    const symbol = SYMBOL_MAP[asset] || "BOOM1000";
    const gran   = GRAN_MAP[tf] || 60;
    wsSend({ forget_all: "candles" });
    wsSend({ forget_all: "ticks" });
    bufRef.current = [];
    orderflowRef.current.reset();
    tickEngRef.current.reset();
    welfordRef.current.reset();
    wsSend({ ticks_history: symbol, count: 200, end: "latest", style: "candles", granularity: gran, subscribe: 1 });
    wsSend({ ticks: symbol, subscribe: 1 });
  }, [wsSend]);

  // ── WS message handler ─────────────────────────────────
  const handleMessage = useCallback((evt) => {
    try {
      const data = JSON.parse(evt.data);
      if (data.error) {
        dispatch({ type: "SET_CONNECT_ERROR", payload: `${data.error.code}: ${data.error.message}` });
        return;
      }
      switch (data.msg_type) {
        case "authorize":
          dispatch({ type: "SET_ACCOUNT", payload: { balance: data.authorize.balance, currency: data.authorize.currency, username: data.authorize.loginid } });
          dispatch({ type: "SET_ENVIRONMENT", payload: data.authorize.is_virtual ? "DEMO" : "LIVE" });
          wsSend({ balance: 1, subscribe: 1 });
          subscribeToAsset(stateRef.current.activeAsset, stateRef.current.activeTf);
          break;
        case "balance":
          dispatch({ type: "SET_ACCOUNT", payload: { balance: data.balance.balance, currency: data.balance.currency } });
          break;
        case "candles":
          if (data.candles) {
            bufRef.current = data.candles.map(c => ({ open: c.open, high: c.high, low: c.low, close: c.close, epoch: c.epoch }));
          }
          break;
        case "ohlc": {
          const c   = data.ohlc;
          const buf = bufRef.current;
          const last = buf[buf.length - 1];
          if (last && last.epoch === c.open_time) {
            buf[buf.length - 1] = { open: c.open, high: c.high, low: c.low, close: c.close, epoch: c.open_time };
          } else {
            buf.push({ open: c.open, high: c.high, low: c.low, close: c.close, epoch: c.open_time });
            if (buf.length > 500) buf.shift();
          }
          dispatch({ type: "SET_PRICE", payload: parseFloat(c.close) });
          break;
        }
        case "tick": {
          const price = parseFloat(data.tick.quote);
          dispatch({ type: "SET_PRICE", payload: price });

          // Feed all 3 engines
          const wf = welfordRef.current.update(price);
          dispatch({ type: "SET_WELFORD", payload: {
            stdDev:            wf.stdDev,
            mean:              wf.mean,
            compressionWarning: wf.compressionWarning,
            sigmaMean:         welfordRef.current.sigmaMean || 0,
          }});

          const of = orderflowRef.current.processTick(price);
          if (of) dispatch({ type: "SET_ORDERFLOW", payload: {
            pocLevel:           of.pocLevel,
            cumulativeDelta:    of.cumulativeDelta,
            absorptionDetected: of.absorptionDetected,
            profile:            of.profile,
            totalVolume:        of.totalVolume || 0,
          }});

          const ts = tickEngRef.current.processTick(price);
          dispatch({ type: "SET_TICK_STATS", payload: ts });
          break;
        }
        default: break;
      }
    } catch(e) { console.error("WS parse error:", e); }
  }, [subscribeToAsset, wsSend]);

  // ── Connect ────────────────────────────────────────────
  const connectDeriv = useCallback((token) => {
    dispatch({ type: "CLEAR_CONNECT_ERROR" });
    tokenRef.current = token || "";
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      dispatch({ type: "SET_CONNECTED", payload: true });
      if (token) {
        ws.send(JSON.stringify({ authorize: token }));
      } else {
        subscribeToAsset(stateRef.current.activeAsset, stateRef.current.activeTf);
      }
      startFusion();
    };
    ws.onmessage = handleMessage;
    ws.onclose   = () => {
      dispatch({ type: "SET_CONNECTED", payload: false });
      if (fusionRef.current) clearInterval(fusionRef.current);
      setTimeout(() => connectDeriv(tokenRef.current), 5000);
    };
    ws.onerror = () => {
      dispatch({ type: "SET_CONNECTED", payload: false });
      dispatch({ type: "SET_CONNECT_ERROR", payload: "Connection failed" });
    };
  }, [handleMessage, subscribeToAsset, startFusion]);

  const connectPublic = useCallback(() => connectDeriv(null), [connectDeriv]);

  return (
    <AppContext.Provider value={{
      state, dispatch,
      connectDeriv, connectPublic, subscribeToAsset,
      pushNotification, requestNotificationPermission,
      navigate,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
