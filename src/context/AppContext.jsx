import { createContext, useContext, useReducer, useRef, useEffect } from "react";

const AppContext = createContext(null);

const initialState = {
  connected: false,
  environment: "DEMO",
  activeAsset: "BOOM_1000",
  currentView: "signals",
  drawerOpen: false,
  account: { server: "", username: "", password: "", balance: 0, equity: 0 },
  signals: { ao: 0, ac: 0, direction: null, lastCandle: null },
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
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_CONNECTED": return { ...state, connected: action.payload };
    case "SET_ENVIRONMENT": return { ...state, environment: action.payload };
    case "SET_ASSET": return { ...state, activeAsset: action.payload, signals: { ao: 0, ac: 0, direction: null, lastCandle: null } };
    case "SET_VIEW": return { ...state, currentView: action.payload };
    case "TOGGLE_DRAWER": return { ...state, drawerOpen: !state.drawerOpen };
    case "CLOSE_DRAWER": return { ...state, drawerOpen: false };
    case "UPDATE_ACCOUNT": return { ...state, account: { ...state.account, ...action.payload } };
    case "UPDATE_SIGNALS": return { ...state, signals: { ...state.signals, ...action.payload } };
    case "SET_POSITIONS": return { ...state, positions: action.payload };
    case "ADD_POSITION": return { ...state, positions: [...state.positions, action.payload] };
    case "SET_PNL": return { ...state, pnl: action.payload };
    case "SET_AUTO_ACTIVE": return { ...state, autoTraderActive: action.payload, marginError: null };
    case "SET_LOT_SIZE": return { ...state, lotSize: action.payload };
    case "SET_POS_COUNT": return { ...state, positionCount: action.payload };
    case "SET_CANDLE": return { ...state, candle: { ...state.candle, ...action.payload } };
    case "ADD_HISTORY": return { ...state, history: [action.payload, ...state.history] };
    case "SET_MARGIN_ERROR": return { ...state, marginError: action.payload };
    case "CLEAR_MARGIN_ERROR": return { ...state, marginError: null };
    case "SET_WA_STATUS": return { ...state, whatsappStatus: action.payload };
    case "SET_QR": return { ...state, qrCode: action.payload };
    case "ADD_NOTIFICATION": return { ...state, notifications: [action.payload, ...state.notifications].slice(0, 50) };
    default: return state;
  }
}

export function AppProvider({ children, navigate }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const wsRef = useRef(null);
  const candleTimerRef = useRef(null);
  const autoLoopRef = useRef(null);
  const candleBufferRef = useRef([]);
  const signalStateRef = useRef({ ao: 0, ac: 0, triggered: false, candlePhase: 0 });

  const pushNotification = (title, body) => {
    dispatch({ type: "ADD_NOTIFICATION", payload: { id: Date.now(), title, body, time: new Date() } });
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/favicon.ico" });
    }
  };

  const requestNotificationPermission = () => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const connectDeriv = (token) => {
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket("wss://ws.binaryws.com/websockets/v3?app_id=1089");
    wsRef.current = ws;

    ws.onopen = () => {
      dispatch({ type: "SET_CONNECTED", payload: true });
      if (token) {
        ws.send(JSON.stringify({ authorize: token }));
      }
      subscribeToAsset(state.activeAsset, ws);
    };

    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      handleDerivMessage(data, ws);
    };

    ws.onclose = () => {
      dispatch({ type: "SET_CONNECTED", payload: false });
      setTimeout(() => connectDeriv(token), 5000);
    };

    ws.onerror = () => {
      dispatch({ type: "SET_CONNECTED", payload: false });
    };
  };

  const subscribeToAsset = (asset, ws) => {
    const symbolMap = { BOOM_1000: "BOOM1000", CRASH_1000: "CRASH1000" };
    const symbol = symbolMap[asset] || "BOOM1000";
    const sock = ws || wsRef.current;
    if (!sock || sock.readyState !== 1) return;
    sock.send(JSON.stringify({ ticks_history: symbol, count: 200, end: "latest", style: "candles", granularity: 60, subscribe: 1 }));
  };

  const computeAO = (candles) => {
    if (candles.length < 34) return 0;
    const median = (c) => (c.high + c.low) / 2;
    const sma5 = candles.slice(-5).reduce((s, c) => s + median(c), 0) / 5;
    const sma34 = candles.slice(-34).reduce((s, c) => s + median(c), 0) / 34;
    return sma5 - sma34;
  };

  const computeAC = (candles) => {
    if (candles.length < 40) return 0;
    const ao = computeAO(candles);
    const aoValues = candles.slice(-10).map((_, i) => {
      const slice = candles.slice(0, candles.length - 9 + i + 1);
      return computeAO(slice);
    });
    const sma5ao = aoValues.slice(-5).reduce((s, v) => s + v, 0) / 5;
    return ao - sma5ao;
  };

  const handleDerivMessage = (data, ws) => {
    if (data.candles) {
      candleBufferRef.current = data.candles.map(c => ({ open: c.open, high: c.high, low: c.low, close: c.close, epoch: c.epoch }));
      updateIndicators();
    }
    if (data.ohlc) {
      const c = data.ohlc;
      const buf = candleBufferRef.current;
      const last = buf[buf.length - 1];
      if (last && last.epoch === c.open_time) {
        buf[buf.length - 1] = { open: c.open, high: c.high, low: c.low, close: c.close, epoch: c.open_time };
      } else {
        buf.push({ open: c.open, high: c.high, low: c.low, close: c.close, epoch: c.open_time });
        if (buf.length > 500) buf.shift();
        onNewCandle();
      }
      updateIndicators();
    }
    if (data.msg_type === "balance") {
      dispatch({ type: "UPDATE_ACCOUNT", payload: { balance: data.balance.balance, currency: data.balance.currency } });
    }
    if (data.msg_type === "proposal_open_contract") {
      const poc = data.proposal_open_contract;
      dispatch({ type: "SET_PNL", payload: poc.profit });
    }
  };

  const updateIndicators = () => {
    const buf = candleBufferRef.current;
    if (buf.length < 34) return;
    const ao = computeAO(buf);
    const ac = computeAC(buf);

    let direction = null;
    const asset = state.activeAsset;
    if (asset === "BOOM_1000" && ao < 0 && ac < 0) direction = "SELL";
    if (asset === "CRASH_1000" && ao > 0 && ac > 0) direction = "BUY";

    signalStateRef.current = { ...signalStateRef.current, ao, ac };
    dispatch({ type: "UPDATE_SIGNALS", payload: { ao, ac, direction } });
  };

  const onNewCandle = () => {
    const sig = signalStateRef.current;
    if (!state.autoTraderActive) return;
    if (sig.candlePhase === 0 && (sig.ao < 0 && sig.ac < 0 || sig.ao > 0 && sig.ac > 0)) {
      signalStateRef.current.triggered = true;
      signalStateRef.current.candlePhase = 1;
      pushNotification("Signal Detected", `${state.activeAsset} alignment confirmed. Waiting 3 candles...`);
    } else if (sig.triggered && sig.candlePhase >= 1 && sig.candlePhase < 3) {
      signalStateRef.current.candlePhase++;
    } else if (sig.triggered && sig.candlePhase === 3) {
      executeEntry();
      signalStateRef.current.candlePhase = 4;
    } else if (sig.triggered && sig.candlePhase >= 4 && sig.candlePhase < 8) {
      signalStateRef.current.candlePhase++;
    } else if (sig.triggered && sig.candlePhase === 8) {
      executeExit();
      signalStateRef.current = { ao: sig.ao, ac: sig.ac, triggered: false, candlePhase: 0 };
    }
  };

  const checkMarginSafety = (lotSize, posCount, balance) => {
    const estimatedMargin = lotSize * posCount * 10;
    if (balance < 10) return estimatedMargin > balance * 0.5;
    if (balance < 50) return posCount > 5;
    return false;
  };

  const executeEntry = () => {
    const { account, lotSize, positionCount, activeAsset } = state;
    if (checkMarginSafety(lotSize, positionCount, account.balance)) {
      dispatch({ type: "SET_MARGIN_ERROR", payload: `ABOVE LIMIT: Requested ${positionCount} positions exceeds safe margin for $${account.balance} account.` });
      pushNotification("Margin Guard", "Trade blocked — ABOVE LIMIT");
      return;
    }
    const direction = activeAsset === "BOOM_1000" ? "SELL" : "BUY";
    const symbol = activeAsset === "BOOM_1000" ? "BOOM1000" : "CRASH1000";
    const tp = direction === "SELL" ? "SELL BOOM1000 | TP 5 CANDLES" : "BUY CRASH1000 | TP 5 CANDLES";
    pushNotification("Trade Entry", tp);
    const entry = { id: Date.now(), asset: symbol, direction, lotSize, positionCount, entryTime: new Date(), status: "open" };
    dispatch({ type: "ADD_POSITION", payload: entry });
  };

  const executeExit = () => {
    dispatch({ type: "SET_POSITIONS", payload: [] });
    const record = { id: Date.now(), asset: state.activeAsset, pnl: state.pnl, date: new Date(), candles: 5 };
    dispatch({ type: "ADD_HISTORY", payload: record });
    pushNotification("Trade Complete", "TRADE COMPLETE. NOX ❄️");
  };

  return (
    <AppContext.Provider value={{ state, dispatch, connectDeriv, subscribeToAsset, pushNotification, requestNotificationPermission, navigate }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
