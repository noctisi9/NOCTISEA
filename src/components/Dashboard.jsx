import { useEffect } from "react";
import { useApp } from "../context/AppContext";
import Header from "./layout/Header";
import NavDrawer from "./layout/NavDrawer";
import MarginErrorBanner from "./layout/MarginErrorBanner";
import TradingView from "./trading/TradingView";
import AccountView from "./account/AccountView";
import HistoryView from "./history/HistoryView";

export default function Dashboard({ navigate, route }) {
  const { state, dispatch } = useApp();

  useEffect(() => {
    if (route === "/dashboard/account") dispatch({ type: "SET_VIEW", payload: "account" });
    else if (route === "/dashboard/history") dispatch({ type: "SET_VIEW", payload: "history" });
    else dispatch({ type: "SET_VIEW", payload: "trading" });
  }, [route]);

  return (
    <div className="dashboard-root">
      <Header navigate={navigate} />
      <NavDrawer navigate={navigate} />
      {state.drawerOpen && (
        <div className="drawer-overlay show" onClick={() => dispatch({ type: "CLOSE_DRAWER" })} />
      )}
      <div className="db-body">
        {state.marginError && <MarginErrorBanner />}
        {state.currentView === "trading" && <TradingView />}
        {state.currentView === "account" && <AccountView />}
        {state.currentView === "history" && <HistoryView />}
      </div>
    </div>
  );
}
