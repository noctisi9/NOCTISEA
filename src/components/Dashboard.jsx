import { useEffect, useRef, useState } from "react";
import { useApp } from "../context/AppContext";
import Header from "./layout/Header";
import NavDrawer from "./layout/NavDrawer";
import AccountView from "./account/AccountView";
import HistoryView from "./history/HistoryView";
import Page0_Chart from "./pages/Page0_Chart";
import Page1_Indicators from "./pages/Page1_Indicators";
import Page2_Orderflow from "./pages/Page2_Orderflow";
import Page3_TickEngine from "./pages/Page3_TickEngine";
import Page4_Fusion from "./pages/Page4_Fusion";
import Page5_Diagnostics from "./pages/Page5_Diagnostics";

const ASSETS = ["BOOM_1000", "CRASH_1000"];
const TFS    = ["M1", "M5", "M15", "M30", "H1", "H4", "D1"];
const PAGES  = [Page0_Chart, Page1_Indicators, Page2_Orderflow, Page3_TickEngine, Page4_Fusion, Page5_Diagnostics];

export default function Dashboard({ navigate, route }) {
  const { state, dispatch, subscribeToAsset, connectPublic, requestNotificationPermission } = useApp();
  const [page, setPage] = useState(0);
  const startX  = useRef(0);
  const startY  = useRef(0);
  const swiping = useRef(false);

  useEffect(() => {
    requestNotificationPermission();
    connectPublic();
  }, []);

  useEffect(() => {
    if (route === "/dashboard/account" || route === "/NOCTISEA/dashboard/account")
      dispatch({ type: "SET_VIEW", payload: "account" });
    else if (route === "/dashboard/history" || route === "/NOCTISEA/dashboard/history")
      dispatch({ type: "SET_VIEW", payload: "history" });
    else
      dispatch({ type: "SET_VIEW", payload: "trading" });
  }, [route]);

  const handleAsset = (key) => {
    dispatch({ type: "SET_ASSET", payload: key });
    subscribeToAsset(key, state.activeTf);
  };

  const handleTf = (tf) => {
    dispatch({ type: "SET_TF", payload: tf });
    subscribeToAsset(state.activeAsset, tf);
  };

  const goNext = () => setPage(p => Math.min(PAGES.length - 1, p + 1));
  const goPrev = () => setPage(p => Math.max(0, p - 1));

  // Swipe is ONLY enabled on pages that are NOT the chart page (page 0)
  // On page 0, the chart handles its own touch events
  const onTouchStart = (e) => {
    if (page === 0) return; // chart page: no swipe nav
    startX.current  = e.touches[0].clientX;
    startY.current  = e.touches[0].clientY;
    swiping.current = true;
  };

  const onTouchEnd = (e) => {
    if (!swiping.current || page === 0) return;
    swiping.current = false;
    const dx = e.changedTouches[0].clientX - startX.current;
    const dy = e.changedTouches[0].clientY - startY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 45) {
      if (dx < 0) goNext();
      else         goPrev();
    }
  };

  const isSubView  = state.currentView === "account" || state.currentView === "history";
  const priceColor = state.signals.direction === "BUY"  ? "#00FF88"
    : state.signals.direction === "SELL" ? "#FF3B5C"
    : "#00E5FF";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden", background: "#0A0D12" }}>
      <Header navigate={navigate} />
      <NavDrawer navigate={navigate} />
      {state.drawerOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.65)", zIndex: 199, backdropFilter: "blur(2px)" }}
          onClick={() => dispatch({ type: "CLOSE_DRAWER" })} />
      )}

      {!isSubView && (
        <div style={{ flexShrink: 0, background: "#0D1117", borderBottom: "1px solid rgba(0,229,255,0.1)" }}>
          {/* Asset + Price row */}
          <div style={{ display: "flex", alignItems: "center", padding: "8px 12px", gap: "8px" }}>
            {ASSETS.map(a => (
              <button key={a} onClick={() => handleAsset(a)} style={{
                padding: "7px 16px", borderRadius: "3px", cursor: "pointer",
                border: state.activeAsset === a ? "1px solid #00E5FF" : "1px solid rgba(0,229,255,0.15)",
                background: state.activeAsset === a ? "rgba(0,229,255,0.12)" : "transparent",
                color: state.activeAsset === a ? "#00E5FF" : "#607080",
                fontFamily: "'Share Tech Mono',monospace", fontSize: "12px", fontWeight: 600, letterSpacing: ".08em",
              }}>{a.replace("_", " ")}</button>
            ))}
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "22px", fontWeight: 700, color: priceColor, lineHeight: 1 }}>
                {state.currentPrice ? state.currentPrice.toFixed(2) : "—"}
              </div>
            </div>
          </div>

          {/* Timeframe row */}
          <div style={{ display: "flex", gap: "4px", padding: "0 10px 6px", overflowX: "auto" }}>
            {TFS.map(t => (
              <button key={t} onClick={() => handleTf(t)} style={{
                flexShrink: 0, padding: "4px 10px", borderRadius: "3px", cursor: "pointer",
                border: state.activeTf === t ? "1px solid #00E5FF" : "1px solid rgba(0,229,255,0.12)",
                background: state.activeTf === t ? "rgba(0,229,255,0.12)" : "transparent",
                color: state.activeTf === t ? "#00E5FF" : "#607080",
                fontFamily: "'Share Tech Mono',monospace", fontSize: "11px", letterSpacing: ".06em",
              }}>{t}</button>
            ))}
          </div>

          {/* Page dots + arrow nav */}
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", padding: "3px 0 6px" }}>
            {/* Prev arrow */}
            <button
              onClick={goPrev}
              disabled={page === 0}
              style={{
                background: "none", border: "none", cursor: page === 0 ? "default" : "pointer",
                color: page === 0 ? "rgba(0,229,255,0.15)" : "rgba(0,229,255,0.7)",
                fontSize: "16px", padding: "0 4px", lineHeight: 1,
              }}
            >‹</button>

            {/* Dots */}
            {PAGES.map((_, i) => (
              <div key={i} onClick={() => setPage(i)} style={{
                width: page === i ? 18 : 6, height: 6,
                borderRadius: 3,
                background: page === i ? "#00E5FF" : "rgba(0,229,255,0.2)",
                cursor: "pointer", transition: "all .2s",
                boxShadow: page === i ? "0 0 6px rgba(0,229,255,0.6)" : "none",
              }} />
            ))}

            {/* Next arrow */}
            <button
              onClick={goNext}
              disabled={page === PAGES.length - 1}
              style={{
                background: "none", border: "none", cursor: page === PAGES.length - 1 ? "default" : "pointer",
                color: page === PAGES.length - 1 ? "rgba(0,229,255,0.15)" : "rgba(0,229,255,0.7)",
                fontSize: "16px", padding: "0 4px", lineHeight: 1,
              }}
            >›</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflow: "hidden", position: "relative", minHeight: 0 }}>
        {isSubView ? (
          state.currentView === "account" ? <AccountView /> : <HistoryView />
        ) : (
          <div style={{ height: "100%", overflow: "hidden" }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}>
            <div style={{
              display: "flex", width: `${PAGES.length * 100}%`, height: "100%",
              transform: `translateX(-${page * (100 / PAGES.length)}%)`,
              transition: "transform .3s cubic-bezier(.4,0,.2,1)",
            }}>
              {PAGES.map((Page, i) => (
                <div key={i} style={{ width: `${100 / PAGES.length}%`, height: "100%", flexShrink: 0, overflow: "hidden" }}>
                  {Math.abs(i - page) <= 1
                    ? <Page onNext={i === 0 ? goNext : undefined} onPrev={i > 0 ? goPrev : undefined} />
                    : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
