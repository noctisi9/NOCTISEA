import React from 'react';
import { useEffect } from "react";
import { useApp } from '../context/AppContext';
import Header from "./layout/Header";
import NavDrawer from "./layout/NavDrawer";
import SignalsView from "./signals/SignalsView";
import AutoTraderView from "./autotrader/AutoTraderView";
import AccountView from "./account/AccountView";
import WhatsAppView from "./whatsapp/WhatsAppView";
import HistoryView from "./history/HistoryView";
import MarginErrorBanner from "./layout/MarginErrorBanner";
import DashboardTabBar from "./layout/DashboardTabBar";

export default function Dashboard({ navigate, route }) {
  const context = useApp();
  
  // Safe layout assignments if context hasn't returned yet
  const state = context?.state || { currentView: "signals", drawerOpen: false, marginError: null };
  const dispatch = context?.dispatch || (() => {});

  useEffect(() => {
    if (!dispatch) return;
    if (route === "/dashboard/account") dispatch({ type: "SET_VIEW", payload: "account" });
    else if (route === "/dashboard/whatsapp") dispatch({ type: "SET_VIEW", payload: "whatsapp" });
    else if (route === "/dashboard/settings") dispatch({ type: "SET_VIEW", payload: "history" });
    else if (route === "/dashboard/autotrader") dispatch({ type: "SET_VIEW", payload: "autotrader" });
    else dispatch({ type: "SET_VIEW", payload: "signals" });
  }, [route, dispatch]);

  const isSubView = ["account", "whatsapp", "history"].includes(state?.currentView || "signals");

  return (
    <div className="dashboard-root">
      <Header navigate={navigate} />
      <NavDrawer navigate={navigate} />
      {state?.drawerOpen && (
        <div className="drawer-overlay" onClick={() => dispatch({ type: "CLOSE_DRAWER" })} />
      )}
      <div className="dashboard-body">
        {state?.marginError && <MarginErrorBanner />}
        {!isSubView && (
          <>
            <DashboardTabBar />
            <div className="dashboard-views">
              <div className={`view-slide ${state?.currentView === "signals" ? "view-active" : "view-hidden"}`}>
                <SignalsView />
              </div>
              <div className={`view-slide ${state?.currentView === "autotrader" ? "view-active" : "view-hidden"}`}>
                <AutoTraderView />
              </div>
            </div>
          </>
        )}
        {state?.currentView === "account" && <AccountView />}
        {state?.currentView === "whatsapp" && <WhatsAppView />}
        {state?.currentView === "history" && <HistoryView />}
      </div>
    </div>
  );
}
