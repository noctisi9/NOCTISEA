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

const ASSETS = ["BOOM_1000","CRASH_1000"];
const TFS    = ["M1","M5","M15","M30","H1","H4","D1"];
const PAGES  = [Page0_Chart, Page1_Indicators, Page2_Orderflow, Page3_TickEngine, Page4_Fusion, Page5_Diagnostics];
const PAGE_LABELS = ["CHART","AO/AC","ORDERFLOW","TICK","FUSION","DIAG"];

export default function Dashboard({ navigate, route }) {
  const { state, dispatch, subscribeToAsset, connectPublic, requestNotificationPermission } = useApp();
  const [page, setPage] = useState(0);
  // Chart touch isolation — only allow swipe from the NAV DOTS or ARROW buttons, never from within the chart
  const swipeAllowed = useRef(false);
  const startX = useRef(0);

  useEffect(() => {
    requestNotificationPermission();
    connectPublic();
  }, []);

  useEffect(() => {
    if (route === "/dashboard/account" || route === "/NOCTISEA/dashboard/account") dispatch({ type:"SET_VIEW", payload:"account" });
    else if (route === "/dashboard/history" || route === "/NOCTISEA/dashboard/history") dispatch({ type:"SET_VIEW", payload:"history" });
    else dispatch({ type:"SET_VIEW", payload:"trading" });
  }, [route]);

  const handleAsset = (key) => {
    dispatch({ type:"SET_ASSET", payload:key });
    subscribeToAsset(key, state.activeTf);
  };
  const handleTf = (tf) => {
    dispatch({ type:"SET_TF", payload:tf });
    subscribeToAsset(state.activeAsset, tf);
  };

  const isSubView = state.currentView === "account" || state.currentView === "history";
  const ActivePage = PAGES[page];

  const priceDir = state.signals.direction;
  const priceColor = priceDir === "BUY" ? "#C9A84C" : priceDir === "SELL" ? "#2979FF" : "#00E5FF";

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", width:"100%", overflow:"hidden", background:"#0A0D12" }}>
      <Header navigate={navigate} />
      <NavDrawer navigate={navigate} />
      {state.drawerOpen && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.65)", zIndex:199, backdropFilter:"blur(2px)" }}
          onClick={() => dispatch({ type:"CLOSE_DRAWER" })} />
      )}

      {!isSubView && (
        <div style={{ flexShrink:0, background:"#0D1117", borderBottom:"1px solid rgba(201,168,76,0.1)" }}>
          {/* Asset + Price */}
          <div style={{ display:"flex", alignItems:"center", padding:"8px 12px", gap:"8px" }}>
            {ASSETS.map(a => (
              <button key={a} onClick={() => handleAsset(a)} style={{
                padding:"7px 16px", borderRadius:"3px", cursor:"pointer",
                border: state.activeAsset===a ? "1px solid #C9A84C" : "1px solid rgba(201,168,76,0.18)",
                background: state.activeAsset===a ? "rgba(201,168,76,0.1)" : "transparent",
                color: state.activeAsset===a ? "#C9A84C" : "#607080",
                fontFamily:"'Share Tech Mono',monospace", fontSize:"12px", fontWeight:600, letterSpacing:".08em",
              }}>{a.replace("_"," ")}</button>
            ))}
            <div style={{ marginLeft:"auto", textAlign:"right" }}>
              <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"22px", fontWeight:700, color:priceColor, lineHeight:1 }}>
                {state.currentPrice ? state.currentPrice.toFixed(2) : "—"}
              </div>
            </div>
          </div>

          {/* Timeframe row */}
          <div style={{ display:"flex", gap:"4px", padding:"0 10px 6px", overflowX:"auto" }}>
            {TFS.map(t => (
              <button key={t} onClick={() => handleTf(t)} style={{
                flexShrink:0, padding:"4px 10px", borderRadius:"3px", cursor:"pointer",
                border: state.activeTf===t ? "1px solid #C9A84C" : "1px solid rgba(201,168,76,0.12)",
                background: state.activeTf===t ? "rgba(201,168,76,0.1)" : "transparent",
                color: state.activeTf===t ? "#C9A84C" : "#607080",
                fontFamily:"'Share Tech Mono',monospace", fontSize:"11px", letterSpacing:".06em",
              }}>{t}</button>
            ))}
          </div>

          {/* Page dots + label */}
          <div style={{ display:"flex", justifyContent:"center", alignItems:"center", gap:"6px", padding:"3px 0 6px" }}>
            {PAGES.map((_, i) => (
              <div key={i} onClick={() => setPage(i)} style={{
                width: page===i ? 22 : 6, height:6, borderRadius:3,
                background: page===i ? "#C9A84C" : "rgba(201,168,76,0.2)",
                cursor:"pointer", transition:"all .2s",
                boxShadow: page===i ? "0 0 6px rgba(201,168,76,0.5)" : "none",
              }} />
            ))}
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"9px", color:"rgba(201,168,76,0.4)", letterSpacing:".15em", marginLeft:"4px" }}>
              {PAGE_LABELS[page]}
            </span>
          </div>
        </div>
      )}

      <div style={{ flex:1, overflow:"hidden", position:"relative", minHeight:0 }}>
        {isSubView ? (
          state.currentView === "account" ? <AccountView /> : <HistoryView />
        ) : (
          <div style={{ height:"100%", position:"relative" }}>
            {/* Left / Right nav arrows — ONLY these trigger page changes */}
            {page > 0 && (
              <button onClick={() => setPage(p => p-1)} style={{
                position:"absolute", left:0, top:"50%", transform:"translateY(-50%)",
                zIndex:50, background:"rgba(10,13,18,0.85)", border:"1px solid rgba(201,168,76,0.2)",
                color:"#C9A84C", fontSize:"18px", padding:"14px 6px", cursor:"pointer",
                borderRadius:"0 4px 4px 0", lineHeight:1,
              }}>‹</button>
            )}
            {page < PAGES.length - 1 && (
              <button onClick={() => setPage(p => p+1)} style={{
                position:"absolute", right:0, top:"50%", transform:"translateY(-50%)",
                zIndex:50, background:"rgba(10,13,18,0.85)", border:"1px solid rgba(201,168,76,0.2)",
                color:"#C9A84C", fontSize:"18px", padding:"14px 6px", cursor:"pointer",
                borderRadius:"4px 0 0 4px", lineHeight:1,
              }}>›</button>
            )}

            {/* Pages — NO touch swipe on the container; arrows only */}
            <div style={{ display:"flex", width:`${PAGES.length*100}%`, height:"100%",
              transform:`translateX(-${page*(100/PAGES.length)}%)`,
              transition:"transform .3s cubic-bezier(.4,0,.2,1)" }}>
              {PAGES.map((Page, i) => (
                <div key={i} style={{ width:`${100/PAGES.length}%`, height:"100%", flexShrink:0, overflow:"hidden" }}>
                  {Math.abs(i-page) <= 1 ? <Page /> : null}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
