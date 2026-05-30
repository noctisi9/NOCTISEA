import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import Header from "./layout/Header";
import NavDrawer from "./layout/NavDrawer";
import MarginErrorBanner from "./layout/MarginErrorBanner";
import AccountView from "./account/AccountView";
import HistoryView from "./history/HistoryView";
import Page0_Chart from "./pages/Page0_Chart";
import Page1_Indicators from "./pages/Page1_Indicators";
import Page2_Orderflow from "./pages/Page2_Orderflow";
import Page3_TickEngine from "./pages/Page3_TickEngine";

const ASSETS = ["BOOM_1000", "CRASH_1000"];
const TFS    = ["M1","M5","M15","M30","H1","H4","D1"];

export default function Dashboard({ navigate, route }) {
  const { state, dispatch, subscribeToAsset, connectPublic, requestNotificationPermission } = useApp();
  const [page, setPage]      = useState(0);
  const swipeRef             = useRef(null);
  const startX               = useRef(0);
  const startY               = useRef(0);
  const isDragging           = useRef(false);

  useEffect(() => {
    requestNotificationPermission();
    connectPublic();
  }, []);

  useEffect(() => {
    if (route === "/dashboard/account") dispatch({ type: "SET_VIEW", payload: "account" });
    else if (route === "/dashboard/history") dispatch({ type: "SET_VIEW", payload: "history" });
    else dispatch({ type: "SET_VIEW", payload: "trading" });
  }, [route]);

  const handleAsset = (key) => {
    dispatch({ type: "SET_ASSET", payload: key });
    subscribeToAsset(key, state.activeTf);
  };

  const handleTf = (tf) => {
    dispatch({ type: "SET_TF", payload: tf });
    subscribeToAsset(state.activeAsset, tf);
  };

  // Horizontal swipe between pages
  const onTouchStart = (e) => {
    startX.current   = e.touches[0].clientX;
    startY.current   = e.touches[0].clientY;
    isDragging.current = true;
  };
  const onTouchEnd = (e) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx < 0) setPage(p => Math.min(3, p + 1));
      else         setPage(p => Math.max(0, p - 1));
    }
  };

  const isSubView = state.currentView === "account" || state.currentView === "history";

  return (
    <div className="dashboard-root">
      <Header navigate={navigate} />
      <NavDrawer navigate={navigate} />
      {state.drawerOpen && (
        <div className="drawer-overlay show" onClick={() => dispatch({ type: "CLOSE_DRAWER" })} />
      )}

      {!isSubView && (
        <>
          {/* Fixed asset + timeframe nav */}
          <div className="global-nav">
            <div className="asset-bar">
              {ASSETS.map(a => (
                <button key={a}
                  className={`asset-btn ${state.activeAsset === a ? "active" : ""}`}
                  onClick={() => handleAsset(a)}>
                  {a.replace("_"," ")}
                </button>
              ))}
              <div className="price-display">
                <div className={`price-val ${state.currentPrice ? "up" : "flat"}`}>
                  {state.currentPrice ? state.currentPrice.toFixed(2) : "—"}
                </div>
              </div>
            </div>
            <div className="tf-bar">
              {TFS.map(t => (
                <button key={t}
                  className={`tf-btn ${state.activeTf === t ? "tf-active" : ""}`}
                  onClick={() => handleTf(t)}>
                  {t}
                </button>
              ))}
            </div>
            {/* Page dots indicator */}
            <div className="page-dots">
              {[0,1,2,3].map(i => (
                <span key={i}
                  className={`page-dot ${page === i ? "dot-active" : ""}`}
                  onClick={() => setPage(i)} />
              ))}
            </div>
          </div>
        </>
      )}

      <div className="db-body">
        {state.marginError && <MarginErrorBanner />}

        {isSubView ? (
          state.currentView === "account" ? <AccountView /> : <HistoryView />
        ) : (
          <div className="swipe-container"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
            ref={swipeRef}>
            <div className="swipe-track" style={{ transform: `translateX(-${page * 100}%)` }}>
              <div className="swipe-page"><Page0_Chart /></div>
              <div className="swipe-page"><Page1_Indicators /></div>
              <div className="swipe-page"><Page2_Orderflow /></div>
              <div className="swipe-page"><Page3_TickEngine /></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
