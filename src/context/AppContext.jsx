import React from 'react';
import { createContext, useContext, useReducer, useRef, useEffect } from 'react';

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
    case "SET_ACCOUNT": return { ...state, account: { ...state.account, ...action.payload } };
    case "SET_SIGNALS": return { ...state, signals: action.payload };
    case "SET_POSITIONS": return { ...state, positions: action.payload };
    case "ADD_POSITION": return { ...state, positions: [...state.positions, action.payload] };
    case "SET_PNL": return { ...state, pnl: action.payload };
    case "SET_AUTOTRADER": return { ...state, autoTraderActive: action.payload };
    case "SET_LOTSIZE": return { ...state, lotSize: action.payload };
    case "SET_POSITION_COUNT": return { ...state, positionCount: action.payload };
    case "SET_CANDLE": return { ...state, candle: action.payload };
    case "SET_HISTORY": return { ...state, history: action.payload };
    case "ADD_HISTORY": return { ...state, history: [action.payload, ...state.history] };
    case "SET_NOTIFICATIONS": return { ...state, notifications: action.payload };
    case "ADD_NOTIFICATION": return { ...state, notifications: [action.payload, ...state.notifications] };
    case "SET_WHATSAPP": return { ...state, whatsappStatus: action.payload };
    case "SET_QR": return { ...state, qrCode: action.payload };
    case "SET_MARGIN_ERROR": return { ...state, marginError: action.payload };
    case "CLEAR_MARGIN_ERROR": return { ...state, marginError: null };
    default: return state;
  }
}

export function AppProvider({ children, navigate }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const socketRef = useRef(null);

  const pushNotification = (title, message) => {
    const notif = { id: Date.now(), title, message, time: new Date() };
    dispatch({ type: "ADD_NOTIFICATION", payload: notif });
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body: message });
    }
  };

  const requestNotificationPermission = () => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  };

  const checkMarginSafety = (lot, count, balance) => {
    const totalMarginRequired = lot * count * 50;
    if (totalMarginRequired > balance && balance > 0) {
      return true;
    }
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
    <AppContext.Provider
      value={{
        state,
        dispatch,
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
