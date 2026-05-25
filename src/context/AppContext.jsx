import React from 'react';
import { createContext, useContext, useReducer, useRef, useCallback } from 'react';

const AppContext = createContext(null);

const initialState = {
  connected: false,
  environment: "DEMO",
  activeAsset: "BOOM_1000",
  currentView: "signals",
  drawerOpen: false,
  account: {
    server: "",
    username: "",
    appId: "",
    token: "",
    balance: 0,
    currency: "USD",
  },
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
    case "SET_HISTORY":        return { ...state, history: action.payload };
    case "ADD_HISTORY":        return { ...state, history: [action.payload, ...state.history] };
    case "ADD_NOTIFICATION":   return { ...state, notifications: [action.payload, ...state.notifications].slice(0, 50) };
    case "SET_WHATSAPP":       return { ...state, whatsappStatus: action.payload };
    case "SET_QR":             return { ...state, qrCode: action.payload };
    case "SET_MARGIN_ERROR":   return { ...state, marginError: action.payload };
    case "CLEAR_MARGIN_ERROR": return { ...state, marginError: null };
    case "SET_CONNECT_ERROR":  return { ...state, connectError: action.payload };
    default: return state;
  }
}

// ── Symbol map ──────────────────────────────────────────────────
const SYMBOL_MAP = {
  BOOM_1000:  "BOOM1000",
  CRASH_1000: "CRASH1000",
};

export function AppProvider({ children, navigate }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const wsRef          = useRef(null);
  const candleBufferRef = useRef([]);
  const autoStateRef   = useRef({ triggered: false, candlePhase: 0 });
  const stateRef       = useRef(state);
  const reqIdRef       = useRef(1);
  stateRef.current     = state;

  const nextReqId = () => ++reqIdRef.current;

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
    const aoValues = candles.slice(-10).map((_, i) =>
      computeAO(candles.slice(0, candles.length - 9 + i + 1))
    );
    const ao   = aoValues[aoValues.length - 1];
    const sma5 = aoValues.slice(-5).reduce((s, v) => s + v, 0) / 5;
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

  // ── Margin check ──────────────────────────────────────────────
  const checkMarginSafety = (lot, count, balance) => {
    if (!balance || balance <= 0) return false;
    if (balance < 10  && count > 2)  return true;
    if (balance < 50  && count > 5)  return true;
    if (balance < 100 && count > 20) return true;
    return (lot * count * 50) > balance;
  };

  // ── WebSocket send helper ─────────────────────────────────────
  const wsSend = useCallback((payload) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ ...payload, req_id: nextReqId() }));
    }
  }, []);

  // ── Subscribe to asset ────────────────────────────────────────
  const subscribeToAsset = useCallback((asset) => {
    const symbol = SYMBOL_MAP[asset] || "BOOM1000";
    // Clear old subscriptions
    wsSend({ forget_all: "candles" });
    wsSend({ forget_all: "ticks" });
    // M1 candle history
    wsSend({
      ticks_history: symbol,
      count: 200,
      end: "latest",
      style: "candles",
      granularity: 60,
      subscribe: 1,
    });
    // Live ticks for price
    wsSend({ ticks: symbol, subscribe: 1 });
  }, [wsSend]);

  // ── Trade entry / exit ────────────────────────────────────────
  const executeEntry = useCallback(() => {
    const { account, lotSize, positionCount, activeAsset } = stateRef.current;
    if (checkMarginSafety(lotSize, positionCount, account.balance)) {
      dispatch({
        type: "SET_MARGIN_ERROR",
        payload: `ABOVE LIMIT: ${positionCount} positions exceeds safe margin for $${account.balance} account.`,
      });
      pushNotification("Margin Guard", "Trade blocked — ABOVE LIMIT");
      return;
    }
    const direction = activeAsset === "BOOM_1000" ? "SELL" : "BUY";
    const symbol    = SYMBOL_MAP[activeAsset];
    const msg       = `${direction} ${symbol} | TP 5 CANDLES`;
    pushNotification("Trade Entry", msg);

    // Send proposal then buy on response
    // contractType: BOOM=PUT (sell spike), CRASH=CALL (buy spike)
    const contractType = direction === "SELL" ? "PUT" : "CALL";
    for (let i = 0; i < positionCount; i++) {
      wsSend({
        proposal: 1,
        amount: lotSize,
        basis: "stake",
        contract_type: contractType,
        currency: account.currency || "USD",
        duration: 5,
        duration_unit: "m",
        symbol,
        subscribe: 1,
      });
    }

    dispatch({
      type: "ADD_POSITION",
      payload: {
        id: Date.now(), asset: symbol, direction,
        lotSize, positionCount, entryTime: new Date(), status: "open",
      },
    });
  }, [pushNotification, wsSend]);

  const executeExit = useCallback(() => {
    // Sell all open positions
    stateRef.current.positions.forEach(pos => {
      if (pos.contractId) {
        wsSend({ sell: pos.contractId, price: 0 });
      }
    });
    dispatch({ type: "SET_POSITIONS", payload: [] });
    dispatch({
      type: "ADD_HISTORY",
      payload: {
        id: Date.now(),
        asset: stateRef.current.activeAsset,
        pnl: stateRef.current.pnl,
        date: new Date(),
        candles: 5,
      },
    });
    pushNotification("Trade Complete", "TRADE COMPLETE. NOX ❄️");
  }, [pushNotification, wsSend]);

  // ── Auto trader candle logic ───────────────────────────────────
  const onNewCandle = useCallback(() => {
    if (!stateRef.current.autoTraderActive) return;
    const buf   = candleBufferRef.current;
    const ao    = computeAO(buf);
    const ac    = computeAC(buf);
    const asset = stateRef.current.activeAsset;
    const auto  = autoStateRef.current;

    const aligned =
      (asset === "BOOM_1000"  && ao < 0 && ac < 0) ||
      (asset === "CRASH_1000" && ao > 0 && ac > 0);

    if (!auto.triggered && aligned) {
      autoStateRef.current = { triggered: true, candlePhase: 1 };
      dispatch({ type: "SET_CANDLE", payload: { count: 1, phase: "confirming" } });
      pushNotification("Signal Detected", `${asset} — waiting 3 candles`);
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

  // ── WS message handler ────────────────────────────────────────
  const handleMessage = useCallback((evt) => {
    try {
      const data = JSON.parse(evt.data);

      if (data.error) {
        console.error("Deriv WS error:", data.error.message);
        dispatch({ type: "SET_CONNECT_ERROR", payload: data.error.message });
        return;
      }

      switch (data.msg_type) {

        case "balance":
          dispatch({ type: "SET_ACCOUNT", payload: { balance: data.balance.balance, currency: data.balance.currency } });
          break;

        case "candles":
          candleBufferRef.current = data.candles.map(c => ({
            open: c.open, high: c.high, low: c.low, close: c.close, epoch: c.epoch,
          }));
          updateIndicators();
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
          // Proposal received — buy the contract
          if (stateRef.current.autoTraderActive || stateRef.current.positions.length > 0) {
            wsSend({ buy: data.proposal.id, price: data.proposal.ask_price });
          }
          break;

        case "buy":
          // Store contract ID on the position
          if (data.buy) {
            const positions = stateRef.current.positions;
            if (positions.length > 0) {
              const updated = [...positions];
              const openIdx = updated.findIndex(p => !p.contractId);
              if (openIdx >= 0) updated[openIdx] = { ...updated[openIdx], contractId: data.buy.contract_id };
              dispatch({ type: "SET_POSITIONS", payload: updated });
            }
            // Subscribe to contract updates for P&L
            wsSend({ proposal_open_contract: 1, contract_id: data.buy.contract_id, subscribe: 1 });
          }
          break;

        case "proposal_open_contract":
          if (data.proposal_open_contract?.profit !== undefined) {
            dispatch({ type: "SET_PNL", payload: data.proposal_open_contract.profit });
          }
          break;

        default:
          break;
      }
    } catch (e) {
      console.error("WS parse error:", e);
    }
  }, [updateIndicators, onNewCandle, wsSend]);

  // ── Main connect function ─────────────────────────────────────
  // New Deriv API flow:
  // 1. PAT auth: POST /trading/v1/options/accounts/{accountId}/otp  → get wsUrl
  // 2. Connect to wsUrl
  // 3. Subscribe to balance + asset
  const connectDeriv = useCallback(async (appId, token, accountId) => {
    dispatch({ type: "SET_CONNECT_ERROR", payload: null });

    try {
      // Step 1: Get authenticated WebSocket URL via OTP endpoint
      const otpRes = await fetch(
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

      if (!otpRes.ok) {
        const errData = await otpRes.json().catch(() => ({}));
        throw new Error(errData?.message || `Auth failed: ${otpRes.status}`);
      }

      const otpData = await otpRes.json();
      const wsUrl   = otpData?.data?.url;

      if (!wsUrl) throw new Error("No WebSocket URL returned from OTP endpoint");

      // Step 2: Connect to authenticated WebSocket URL
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        dispatch({ type: "SET_CONNECTED", payload: true });
        dispatch({ type: "SET_CONNECT_ERROR", payload: null });
        // Subscribe to balance
        wsSend({ balance: 1, subscribe: 1 });
        // Subscribe to asset data
        subscribeToAsset(stateRef.current.activeAsset);
        // Detect demo vs real from URL
        const isDemo = wsUrl.includes("/demo");
        dispatch({ type: "SET_ENVIRONMENT", payload: isDemo ? "DEMO" : "LIVE" });
      };

      ws.onmessage = handleMessage;

      ws.onclose = () => {
        dispatch({ type: "SET_CONNECTED", payload: false });
        // Auto-reconnect after 5s
        setTimeout(() => connectDeriv(appId, token, accountId), 5000);
      };

      ws.onerror = () => {
        dispatch({ type: "SET_CONNECTED", payload: false });
        dispatch({ type: "SET_CONNECT_ERROR", payload: "WebSocket connection error" });
      };

    } catch (err) {
      dispatch({ type: "SET_CONNECTED", payload: false });
      dispatch({ type: "SET_CONNECT_ERROR", payload: err.message });
      console.error("connectDeriv error:", err);
    }
  }, [handleMessage, subscribeToAsset, wsSend]);

  // ── Public feed (no auth — for market data only) ──────────────
  const connectPublic = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }
    const ws = new WebSocket("wss://ws.binaryws.com/websockets/v3?app_id=1089");
    wsRef.current = ws;
    ws.onopen    = () => {
      dispatch({ type: "SET_CONNECTED", payload: true });
      subscribeToAsset(stateRef.current.activeAsset);
    };
    ws.onmessage = handleMessage;
    ws.onclose   = () => dispatch({ type: "SET_CONNECTED", payload: false });
  }, [handleMessage, subscribeToAsset]);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        connectDeriv,
        connectPublic,
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
