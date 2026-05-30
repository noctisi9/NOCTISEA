import React, { createContext, useContext, useReducer, useRef, useCallback } from 'react';
import { WelfordRollingEngine } from '../engines/WelfordEngine';
import { SyntheticOrderflowMatrix } from '../engines/OrderflowEngine';
import { TickEngine } from '../engines/TickEngine';
import { SignalFusion } from '../engines/SignalFusion';

const AppContext = createContext(null);

const initialState = {
  connected: false,
  environment: "DEMO",
  activeAsset: "BOOM_1000",
  activeTf: "M1",
  currentView: "trading",
  drawerOpen: false,
  account: { token: "", balance: 0, currency: "USD", username: "" },
  signals: { ao: 0, ac: 0, direction: null, safe: false, reason: "" },
  candles: [],
  currentPrice: 0,
  orderflow: { pocLevel: 0, cumulativeDelta: 0, absorptionDetected: false, profile: [] },
  tickStats: { hz: 0, bullTicks: 0, bearTicks: 0, bullPct: 50, bearPct: 50, avgVelocity: 0 },
  welford: { stdDev: 0, mean: 0, compressionWarning: false },
  positions: [],
  pnl: 0,
  history: [],
  notifications: [],
  marginError: null,
  connectError: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_CONNECTED":      return { ...state, connected: action.payload };
    case "SET_ENVIRONMENT":    return { ...state, environment: action.payload };
    case "SET_ASSET":          return { ...state, activeAsset: action.payload, candles: [], currentPrice: 0 };
    case "SET_TF":             return { ...state, activeTf: action.payload, candles: [] };
    case "SET_VIEW":           return { ...state, currentView: action.payload };
    case "TOGGLE_DRAWER":      return { ...state, drawerOpen: !state.drawerOpen };
    case "CLOSE_DRAWER":       return { ...state, drawerOpen: false };
    case "SET_ACCOUNT":        return { ...state, account: { ...state.account, ...action.payload } };
    case "SET_SIGNALS":        return { ...state, signals: action.payload };
    case "SET_CANDLES":        return { ...state, candles: action.payload };
    case "SET_PRICE":          return { ...state, currentPrice: action.payload };
    case "SET_ORDERFLOW":      return { ...state, orderflow: action.payload };
    case "SET_TICK_STATS":     return { ...state, tickStats: action.payload };
    case "SET_WELFORD":        return { ...state, welford: action.payload };
    case "SET_POSITIONS":      return { ...state, positions: action.payload };
    case "ADD_POSITION":       return { ...state, positions: [...state.positions, action.payload] };
    case "SET_PNL":            return { ...state, pnl: action.payload };
    case "ADD_HISTORY":        return { ...state, history: [action.payload, ...state.history] };
    case "ADD_NOTIFICATION":   return { ...state, notifications: [action.payload, ...state.notifications].slice(0, 50) };
    case "SET_MARGIN_ERROR":   return { ...state, marginError: action.payload };
    case "CLEAR_MARGIN_ERROR": return { ...state, marginError: null };
    case "SET_CONNECT_ERROR":  return { ...state, connectError: action.payload };
    case "CLEAR_CONNECT_ERROR":return { ...state, connectError: null };
    default: return state;
  }
}

const SYMBOL_MAP = { BOOM_1000: "BOOM1000", CRASH_1000: "CRASH1000" };
const GRAN_MAP   = { M1: 60, M5: 300, M15: 900, M30: 1800, H1: 3600, H4: 14400, D1: 86400 };
const WS_URL     = "wss://ws.binaryws.com/websockets/v3?app_id=1089";

export function AppProvider({ children, navigate }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const wsRef       = useRef(null);
  const bufRef      = useRef([]);   // candle buffer
  const stateRef    = useRef(state);
  const tokenRef    = useRef("");
  stateRef.current  = state;

  // Engine instances — persistent across renders
  const welfordRef   = useRef(new WelfordRollingEngine(1000));
  const orderflowRef = useRef(new SyntheticOrderflowMatrix(0.01, 500));
  const tickEngRef   = useRef(new TickEngine());
  const fusionRef    = useRef(new SignalFusion());

  // Ticker for fusion polling every 100ms
  const fusionTimer  = useRef(null);

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

  // ── Signal Fusion polling ──────────────────────────────
  const startFusionLoop = useCallback(() => {
    if (fusionTimer.current) clearInterval(fusionTimer.current);
    fusionTimer.current = setInterval(() => {
      const buf = bufRef.current;
      if (buf.length < 34) return;
      const ao  = computeAO(buf);
      const ac  = computeAC(buf);
      const asset = stateRef.current.activeAsset;
      const of  = stateRef.current.orderflow;
      const wf  = stateRef.current.welford;

      const result = fusionRef.current.evaluate({ ao, ac, asset, orderflow: of, welford: wf });

      const prevDir = stateRef.current.signals.direction;
      if (result.signal && result.signal !== prevDir) {
        pushNotification(
          `🔔 NOCTIS SIGNAL`,
          `${result.signal === "BUY" ? "▲ BUY" : "▼ SELL"} ${asset.replace("_"," ")} — ${result.reason}`
        );
      }

      dispatch({ type: "SET_SIGNALS", payload: {
        ao, ac,
        direction: result.signal,
        safe: result.safe,
        reason: result.reason,
        e1Signal: result.e1Signal,
        e2Safe: result.e2Safe,
        e3Safe: result.e3Safe,
      }});
      dispatch({ type: "SET_CANDLES", payload: [...buf.slice(-100)] });
    }, 100);
  }, [pushNotification]);

  // ── WS send ────────────────────────────────────────────
  const wsSend = useCallback((payload) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  }, []);

  // ── Subscribe to asset + timeframe ────────────────────
  const subscribeToAsset = useCallback((asset, tf = "M1") => {
    const symbol = SYMBOL_MAP[asset] || "BOOM1000";
    const gran   = GRAN_MAP[tf] || 60;
    wsSend({ forget_all: "candles" });
    wsSend({ forget_all: "ticks" });
    // Reset engines on new subscription
    bufRef.current = [];
    orderflowRef.current.reset();
    tickEngRef.current.reset();
    welfordRef.current.reset();
    // Subscribe
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
        case "candles":
          bufRef.current = data.candles.map(c => ({
            open: c.open, high: c.high, low: c.low, close: c.close, epoch: c.epoch
          }));
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

          // Feed all 3 engines on every tick
          const wf = welfordRef.current.update(price);
          dispatch({ type: "SET_WELFORD", payload: { stdDev: wf.stdDev, mean: wf.mean, compressionWarning: wf.compressionWarning } });

          const of = orderflowRef.current.processTick(price);
          if (of) dispatch({ type: "SET_ORDERFLOW", payload: { pocLevel: of.pocLevel, cumulativeDelta: of.cumulativeDelta, absorptionDetected: of.absorptionDetected, profile: of.profile } });

          const ts = tickEngRef.current.processTick(price);
          dispatch({ type: "SET_TICK_STATS", payload: ts });
          break;
        }

        case "balance":
          dispatch({ type: "SET_ACCOUNT", payload: { balance: data.balance.balance, currency: data.balance.currency } });
          break;

        default: break;
      }
    } catch(e) { console.error("WS error:", e); }
  }, []);

  // ── Connect ────────────────────────────────────────────
  const connectDeriv = useCallback((token) => {
    dispatch({ type: "CLEAR_CONNECT_ERROR" });
    tokenRef.current = token || "";
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      dispatch({ type: "SET_CONNECTED", payload: true });
      if (token) ws.send(JSON.stringify({ authorize: token }));
      subscribeToAsset(stateRef.current.activeAsset, stateRef.current.activeTf);
      startFusionLoop();
    };
    ws.onmessage = handleMessage;
    ws.onclose   = () => {
      dispatch({ type: "SET_CONNECTED", payload: false });
      setTimeout(() => connectDeriv(tokenRef.current), 5000);
    };
    ws.onerror = () => {
      dispatch({ type: "SET_CONNECTED", payload: false });
      dispatch({ type: "SET_CONNECT_ERROR", payload: "Connection failed" });
    };
  }, [handleMessage, subscribeToAsset, startFusionLoop]);

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
