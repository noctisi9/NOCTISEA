import React, { createContext, useContext, useReducer, useRef, useCallback } from 'react';
import { WelfordRollingEngine } from '../engines/WelfordEngine';
import { SyntheticOrderflowMatrix } from '../engines/OrderflowEngine';
import { TickEngine } from '../engines/TickEngine';
import { SecondCandleEngine } from '../engines/SecondCandleEngine';

const AppContext = createContext(null);

const initialState = {
  connected: false,
  environment: "DEMO",
  activeAsset: "BOOM_1000",
  activeTf: "M1",
  currentView: "trading",
  drawerOpen: false,
  account: { token: "", balance: 0, currency: "USD", username: "" },
  signals: {
    ao: 0, ac: 0,
    direction: null,
    e1Signal: null,
    ofSignal: null,
    tickSignal: null,
    spikeWarning: false,
    confidence: 0,
    reason: "",
    sigmaMean: 0,
    recentSpikes: 0,
    lvd: 0,
    phase: "NORMAL",
  },
  candles: [],
  secondCandles: [],       // synthetic 1-second candles
  currentSecCandle: null,
  currentPrice: 0,
  orderflow: { pocLevel: 0, cumulativeDelta: 0, absorptionDetected: false, profile: [], totalVolume: 0 },
  tickStats: { hz: 0, bullTicks: 0, bearTicks: 0, bullPct: 50, bearPct: 50, avgVelocity: 0 },
  welford: { stdDev: 0, mean: 0, compressionWarning: false, sigmaMean: 0 },
  positions: [],
  pnl: 0,
  history: [],
  notifications: [],
  marginError: null,
  connectError: null,
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_CONNECTED":       return { ...state, connected: action.payload };
    case "SET_ENVIRONMENT":     return { ...state, environment: action.payload };
    case "SET_ASSET":           return { ...state, activeAsset: action.payload, candles: [], currentPrice: 0, secondCandles: [], currentSecCandle: null };
    case "SET_TF":              return { ...state, activeTf: action.payload, candles: [] };
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
    case "SET_SEC_CANDLES":     return { ...state, secondCandles: action.payload.candles, currentSecCandle: action.payload.current };
    case "ADD_HISTORY":         return { ...state, history: [action.payload, ...state.history] };
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

  const welfordRef    = useRef(new WelfordRollingEngine(1000));
  const orderflowRef  = useRef(new SyntheticOrderflowMatrix(0.01, 500));
  const tickEngRef    = useRef(new TickEngine());
  const secCandleRef  = useRef(new SecondCandleEngine(120));

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

  const runFusion = useCallback(() => {
    const buf = bufRef.current;
    if (buf.length < 34) return;

    const ao    = computeAO(buf);
    const ac    = computeAC(buf);
    const asset = stateRef.current.activeAsset;
    const of    = stateRef.current.orderflow;
    const wf    = stateRef.current.welford;
    const ts    = stateRef.current.tickStats;
    const sc    = secCandleRef.current;

    const lvd          = sc.lvd;
    const recentSpikes = sc.recentSpikes;
    const phase        = sc.getPhase();

    let e1Signal = null;
    if (asset === "BOOM_1000"  && ao < 0 && ac < 0) e1Signal = "SELL";
    if (asset === "CRASH_1000" && ao > 0 && ac > 0) e1Signal = "BUY";

    let ofSignal = null;
    if (!of.absorptionDetected) {
      if (of.cumulativeDelta > 10)  ofSignal = "BUY";
      if (of.cumulativeDelta < -10) ofSignal = "SELL";
    }

    let tickSignal = null;
    const spikeWarning = wf.compressionWarning && ts.hz < 8;
    if (!spikeWarning) {
      const bullBias = (ts.bullTicks || 0) > (ts.bearTicks || 0);
      if (bullBias && ts.hz >= 8)  tickSignal = "BUY";
      if (!bullBias && ts.hz >= 8) tickSignal = "SELL";
    } else {
      tickSignal = "SPIKE WARNING";
    }

    // Phase boosts confidence
    const agreeing = [e1Signal, ofSignal, tickSignal === "SPIKE WARNING" ? null : tickSignal]
      .filter(s => s !== null && s === e1Signal).length;
    let confidence = 0;
    if (e1Signal) {
      confidence = agreeing >= 3 ? 95 : agreeing === 2 ? 70 : 45;
      if (Math.abs(of.cumulativeDelta) > 30 && ts.hz >= 10 && ts.hz <= 18)
        confidence = Math.min(99, confidence + 10);
      // HOT phase on BOOM = spike incoming, boost confidence
      if (phase === "HOT" && asset === "BOOM_1000") confidence = Math.min(99, confidence + 8);
      // COOL = deep LVD = spike building
      if (phase === "COOL" && lvd > 2) confidence = Math.min(99, confidence + 5);
    }

    const direction = spikeWarning ? null : (e1Signal || null);
    const prevDir   = stateRef.current.signals.direction;
    const prevSpike = stateRef.current.signals.spikeWarning;

    if (direction && direction !== prevDir) {
      pushNotification(`🔔 NOCTIS SIGNAL`,
        `${direction === "BUY" ? "▲ BUY" : "▼ SELL"} ${asset.replace("_"," ")} — ${confidence}% confidence`);
    }
    if (spikeWarning && !prevSpike) {
      pushNotification("⚡ SPIKE WARNING", `${asset.replace("_"," ")} — Compression detected. Exit positions.`);
    }

    dispatch({ type: "SET_SIGNALS", payload: {
      ao, ac, direction,
      e1Signal, ofSignal, tickSignal,
      spikeWarning, confidence,
      reason: spikeWarning ? "Compression detected" : direction ? `${confidence}% confidence` : "Engines not aligned",
      recentSpikes, lvd, phase,
    }});
    dispatch({ type: "SET_CANDLES", payload: [...buf.slice(-100)] });
  }, [pushNotification]);

  const startFusion = useCallback(() => {
    if (fusionRef.current) clearInterval(fusionRef.current);
    fusionRef.current = setInterval(runFusion, 200);
  }, [runFusion]);

  const wsSend = useCallback((payload) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  }, []);

  const subscribeToAsset = useCallback((asset, tf = "M1") => {
    const symbol = SYMBOL_MAP[asset] || "BOOM1000";
    const gran   = GRAN_MAP[tf] || 60;
    wsSend({ forget_all: "candles" });
    wsSend({ forget_all: "ticks" });
    bufRef.current = [];
    orderflowRef.current.reset();
    tickEngRef.current.reset();
    welfordRef.current.reset();
    secCandleRef.current.reset();
    wsSend({ ticks_history: symbol, count: 200, end: "latest", style: "candles", granularity: gran, subscribe: 1 });
    wsSend({ ticks: symbol, subscribe: 1 });
  }, [wsSend]);

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
          const ts_ms = (data.tick.epoch || Math.floor(Date.now()/1000)) * 1000;
          dispatch({ type: "SET_PRICE", payload: price });

          const wf = welfordRef.current.update(price);
          dispatch({ type: "SET_WELFORD", payload: {
            stdDev: wf.stdDev, mean: wf.mean,
            compressionWarning: wf.compressionWarning,
            sigmaMean: welfordRef.current.sigmaMean || 0,
          }});

          const of = orderflowRef.current.processTick(price);
          if (of) dispatch({ type: "SET_ORDERFLOW", payload: {
            pocLevel: of.pocLevel, cumulativeDelta: of.cumulativeDelta,
            absorptionDetected: of.absorptionDetected, profile: of.profile, totalVolume: of.totalVolume || 0,
          }});

          const ts = tickEngRef.current.processTick(price);
          dispatch({ type: "SET_TICK_STATS", payload: ts });

          // Feed 1-second candle engine
          const sc = secCandleRef.current.processTick(price, ts_ms);
          dispatch({ type: "SET_SEC_CANDLES", payload: { candles: [...sc.candles], current: sc.current } });
          break;
        }
        default: break;
      }
    } catch(e) { console.error("WS parse error:", e); }
  }, [subscribeToAsset, wsSend]);

  const connectDeriv = useCallback((token) => {
    dispatch({ type: "CLEAR_CONNECT_ERROR" });
    tokenRef.current = token || "";
    if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); }

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      dispatch({ type: "SET_CONNECTED", payload: true });
      if (token) ws.send(JSON.stringify({ authorize: token }));
      else subscribeToAsset(stateRef.current.activeAsset, stateRef.current.activeTf);
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
