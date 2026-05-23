import React from 'react';
import { createContext, useContext, useReducer, useRef, useCallback } from 'react';

const AppContext = createContext(null);

const initialState = {
  connected: false,
  environment: "DEMO",
  activeAsset: "BOOM_1000",
  currentView: "signals",
  drawerOpen: false,
  account: { server: "", username: "", password: "", balance: 0, equity: 0 },
  signals: { ao: 0, ac: 0, direction: null, lastCandle: null },
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
};

function reducer(state, action) {
  switch (action.type) {
    case "SET_CONNECTED":      return { ...state, connected: action.payload };
    case "SET_ENVIRONMENT":    return { ...state, environment: action.payload };
    case "SET_ASSET":          return { ...state, activeAsset: action.payload, signals: { ao: 0, ac: 0, direction: null, lastCandle: null }, candles: [], currentPrice: 0 };
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
    case "SET_HISTORY":        return { ...state, history: action.payload };
    case "ADD_HISTORY":        return { ...state, history: [action.payload, ...state.history] };
    case "SET_NOTIFICATIONS":  return { ...state, notifications: action.payload };
    case "ADD_NOTIFICATION":   return { ...state, notifications: [action.payload, ...state.notifications] };
    case "SET_WHATSAPP":       return { ...state, whatsappStatus: action.payload };
    case "SET_QR":             return { ...state, qrCode: action.payload };
    case "SET_MARGIN_ERROR":   return { ...state, marginError: action.payload };
    case "CLEAR_MARGIN_ERROR": return { ...state, marginError: null };
    default: return state;
  }
}

export function AppProvider({ children, navigate }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Refs — mutable values that don't need to trigger re-renders
  const socketRef       = useRef(null);
  const candleBufferRef = useRef([]);
  const autoStateRef    = useRef({ triggered: false, candlePhase: 0 });
  const stateRef        = useRef(state);
  stateRef.current      = state;

  // ── Notifications ─────────────────────────────────────────────
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

  // ── Indicator computation ─────────────────────────────────────
  const computeAO = (candles) => {
    if (candles.length < 34) return 0;
    const median = (c) => (parseFloat(c.high) + parseFloat(c.low)) / 2;
    const sma5  = candles.slice(-5).reduce((s, c) => s + median(c), 0) / 5;
    const sma34 = candles.slice(-34).reduce((s, c) => s + median(c), 0) / 34;
    return sma5 - sma34;
  };

  const computeAC = (candles) => {
    if (candles.length < 40) return 0;
    const aoValues = candles.slice(-10).map((_, i) => {
      return computeAO(candles.slice(0, candles.length - 9 + i + 1));
    });
    const ao    = aoValues[aoValues.length - 1];
    const sma5  = aoValues.slice(-5).reduce((s, v) => s + v, 0) / 5;
    return ao - sma5;
  };

  // ── Margin safety ─────────────────────────────────────────────
  const checkMarginSafety = (lot, count, balance) => {
    const totalMarginRequired = lot * count * 50;
    return totalMarginRequired > balance && balance > 0;
  };

  // ── Deriv order execution ─────────────────────────────────────
  const placeDerivedOrder = (direction, symbol, lotSize, token) => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !token) return;

    // Deriv contract types for synthetics
    // BOOM: sell = CALLE (touches spike down), CRASH: buy = PUTE
    // For spike trading we use Rise/Fall (CALL/PUT) contracts
    const contractType = direction === "BUY" ? "CALL" : "PUT";

    ws.send(JSON.stringify({
      buy: 1,
      price: lotSize,
      parameters: {
        amount: lotSize,
        basis: "stake",
        contract_type: contractType,
        currency: "USD",
        duration: 5,
        duration_unit: "m",
        symbol: symbol,
      },
    }));
  };

  const sellAllContracts = (token) => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN || !token) return;
    const positions = stateRef.current.positions;
    positions.forEach(pos => {
      if (pos.contractId) {
        ws.send(JSON.stringify({ sell: pos.contractId, price: 0 }));
      }
    });
  };

  // ── Trade lifecycle ───────────────────────────────────────────
  const executeEntry = useCallback(() => {
    const { account, lotSize, positionCount, activeAsset } = stateRef.current;
    if (checkMarginSafety(lotSize, positionCount, account.balance)) {
      dispatch({
        type: "SET_MARGIN_ERROR",
        payload: `ABOVE LIMIT: Requested ${positionCount} positions exceeds safe margin for $${account.balance} account.`,
      });
      pushNotification("Margin Guard", "Trade blocked — ABOVE LIMIT");
      return;
    }
    const direction = activeAsset === "BOOM_1000" ? "SELL" : "BUY";
    const symbol    = activeAsset === "BOOM_1000" ? "1HZ1000V" : "RDBULL1000";
    const msg       = direction === "SELL"
      ? "SELL BOOM1000 | TP 5 CANDLES"
      : "BUY CRASH1000 | TP 5 CANDLES";

    pushNotification("Trade Entry", msg);

    // Fire orders up to positionCount
    for (let i = 0; i < positionCount; i++) {
      placeDerivedOrder(direction, symbol, lotSize, account.password);
    }

    const entry = {
      id: Date.now(), asset: symbol, direction,
      lotSize, positionCount, entryTime: new Date(), status: "open",
    };
    dispatch({ type: "ADD_POSITION", payload: entry });
  }, [pushNotification]);

  const executeExit = useCallback(() => {
    const { account } = stateRef.current;
    sellAllContracts(account.password);
    dispatch({ type: "SET_POSITIONS", payload: [] });
    const record = {
      id: Date.now(),
      asset: stateRef.current.activeAsset,
      pnl: stateRef.current.pnl,
      date: new Date(),
      candles: 5,
    };
    dispatch({ type: "ADD_HISTORY", payload: record });
    pushNotification("Trade Complete", "TRADE COMPLETE. NOX ❄️");
  }, [pushNotification]);

  // ── Auto trader candle logic ───────────────────────────────────
  const onNewCandle = useCallback(() => {
    if (!stateRef.current.autoTraderActive) return;
    const buf  = candleBufferRef.current;
    const ao   = computeAO(buf);
    const ac   = computeAC(buf);
    const asset = stateRef.current.activeAsset;
    const auto  = autoStateRef.current;

    const aligned =
      (asset === "BOOM_1000"  && ao < 0 && ac < 0) ||
      (asset === "CRASH_1000" && ao > 0 && ac > 0);

    if (!auto.triggered && aligned) {
      autoStateRef.current = { triggered: true, candlePhase: 1 };
      dispatch({ type: "SET_CANDLE", payload: { count: 1, phase: "confirming" } });
      pushNotification("Signal Detected", `${asset} alignment confirmed. Waiting 3 candles…`);
    } else if (auto.triggered && auto.candlePhase >= 1 && auto.candlePhase < 3) {
      const next = auto.candlePhase + 1;
      autoStateRef.current.candlePhase = next;
      dispatch({ type: "SET_CANDLE", payload: { count: next, phase: "confirming" } });
    } else if (auto.triggered && auto.candlePhase === 3) {
      autoStateRef.current.candlePhase = 4;
      dispatch({ type: "SET_CANDLE", payload: { count: 4, phase: "entry" } });
      executeEntry();
    } else if (auto.triggered && auto.candlePhase >= 4 && auto.candlePhase < 8) {
      const next = auto.candlePhase + 1;
      autoStateRef.current.candlePhase = next;
      dispatch({ type: "SET_CANDLE", payload: { count: next - 3, phase: "holding" } });
    } else if (auto.triggered && auto.candlePhase >= 8) {
      autoStateRef.current = { triggered: false, candlePhase: 0 };
      dispatch({ type: "SET_CANDLE", payload: { count: 0, phase: "waiting" } });
      executeExit();
    }
  }, [executeEntry, executeExit, pushNotification]);

  // ── Indicator update ──────────────────────────────────────────
  const updateIndicators = useCallback(() => {
    const buf = candleBufferRef.current;
    if (buf.length < 34) return;
    const ao = computeAO(buf);
    const ac = computeAC(buf);
    const asset = stateRef.current.activeAsset;
    let direction = null;
    if (asset === "BOOM_1000"  && ao < 0 && ac < 0) direction = "SELL";
    if (asset === "CRASH_1000" && ao > 0 && ac > 0) direction = "BUY";
    dispatch({ type: "SET_SIGNALS", payload: { ao, ac, direction, lastCandle: null } });
    // Push latest candles to state for chart
    dispatch({ type: "SET_CANDLES", payload: [...buf.slice(-80)] });
  }, []);

  // ── Deriv WebSocket ───────────────────────────────────────────
  const subscribeToAsset = useCallback((asset, ws) => {
    const symbolMap = { BOOM_1000: "1HZ1000V", CRASH_1000: "RDBULL1000" };
    const symbol = symbolMap[asset] || "1HZ1000V";
    const sock = ws || socketRef.current;
    if (!sock || sock.readyState !== WebSocket.OPEN) return;
    // Unsubscribe existing
    sock.send(JSON.stringify({ forget_all: "candles" }));
    sock.send(JSON.stringify({ forget_all: "ticks" }));
    // Subscribe candles M1
    sock.send(JSON.stringify({
      ticks_history: symbol,
      count: 200,
      end: "latest",
      style: "candles",
      granularity: 60,
      subscribe: 1,
    }));
    // Subscribe ticks for live price
    sock.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
  }, []);

  const connectDeriv = useCallback((token) => {
    if (socketRef.current) {
      socketRef.current.onclose = null;
      socketRef.current.close();
    }

    const ws = new WebSocket("wss://ws.binaryws.com/websockets/v3?app_id=1089");
    socketRef.current = ws;

    ws.onopen = () => {
      dispatch({ type: "SET_CONNECTED", payload: true });
      if (token) {
        ws.send(JSON.stringify({ authorize: token }));
      } else {
        subscribeToAsset(stateRef.current.activeAsset, ws);
      }
    };

    ws.onmessage = (evt) => {
      try {
        const data = JSON.parse(evt.data);

        // Auth response — then subscribe
        if (data.msg_type === "authorize") {
          dispatch({ type: "SET_ACCOUNT", payload: { balance: data.authorize.balance, currency: data.authorize.currency } });
          dispatch({ type: "SET_ENVIRONMENT", payload: data.authorize.is_virtual ? "DEMO" : "LIVE" });
          subscribeToAsset(stateRef.current.activeAsset, ws);
          // Subscribe to balance updates
          ws.send(JSON.stringify({ balance: 1, subscribe: 1 }));
        }

        // Balance updates
        if (data.msg_type === "balance") {
          dispatch({ type: "SET_ACCOUNT", payload: { balance: data.balance.balance } });
          dispatch({ type: "SET_PNL", payload: data.balance.balance - (stateRef.current.account.balance || data.balance.balance) });
        }

        // Historical candles
        if (data.msg_type === "candles" && data.candles) {
          candleBufferRef.current = data.candles.map(c => ({
            open: c.open, high: c.high, low: c.low, close: c.close, epoch: c.epoch,
          }));
          updateIndicators();
        }

        // Streaming candle updates
        if (data.msg_type === "ohlc" && data.ohlc) {
          const c   = data.ohlc;
          const buf = candleBufferRef.current;
          const last = buf[buf.length - 1];
          if (last && last.epoch === c.open_time) {
            // Update current candle
            buf[buf.length - 1] = {
              open: c.open, high: c.high, low: c.low, close: c.close, epoch: c.open_time,
            };
          } else {
            // New candle — trigger candle logic
            buf.push({ open: c.open, high: c.high, low: c.low, close: c.close, epoch: c.open_time });
            if (buf.length > 500) buf.shift();
            onNewCandle();
          }
          dispatch({ type: "SET_PRICE", payload: parseFloat(c.close) });
          updateIndicators();
        }

        // Live tick price
        if (data.msg_type === "tick" && data.tick) {
          dispatch({ type: "SET_PRICE", payload: parseFloat(data.tick.quote) });
        }

        // Buy contract response
        if (data.msg_type === "buy" && data.buy) {
          const positions = stateRef.current.positions;
          if (positions.length > 0) {
            const updated = positions.map((p, i) =>
              i === positions.length - 1
                ? { ...p, contractId: data.buy.contract_id }
                : p
            );
            dispatch({ type: "SET_POSITIONS", payload: updated });
          }
        }

        // Open contract P&L updates
        if (data.msg_type === "proposal_open_contract") {
          dispatch({ type: "SET_PNL", payload: data.proposal_open_contract.profit });
        }

      } catch (e) {
        console.error("WS parse error:", e);
      }
    };

    ws.onclose = () => {
      dispatch({ type: "SET_CONNECTED", payload: false });
      // Reconnect after 5s
      setTimeout(() => connectDeriv(token), 5000);
    };

    ws.onerror = () => {
      dispatch({ type: "SET_CONNECTED", payload: false });
    };
  }, [subscribeToAsset, updateIndicators, onNewCandle]);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        connectDeriv,
        subscribeToAsset,
        pushNotification,
        requestNotificationPermission,
        checkMarginSafety,
        executeEntry,
        executeExit,
        navigate,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
