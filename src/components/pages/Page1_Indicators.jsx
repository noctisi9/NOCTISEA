import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import CandleChart from "../trading/CandleChart";
import OscillatorChart from "../trading/OscillatorChart";

export default function Page1_Indicators() {
  const { state } = useApp();
  const [aoHist, setAoHist] = useState(Array(100).fill(0));
  const [acHist, setAcHist] = useState(Array(100).fill(0));

  useEffect(() => {
    setAoHist(p => [...p.slice(1), state.signals.ao || 0]);
    setAcHist(p => [...p.slice(1), state.signals.ac || 0]);
  }, [state.signals.ao, state.signals.ac]);

  const ao  = state.signals.ao || 0;
  const ac  = state.signals.ac || 0;
  const dir = state.signals.direction;
  const aoBull = ao > 0;
  const acBull = ac > 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {/* Chart - top half */}
      <CandleChart candles={state.candles} currentPrice={state.currentPrice} asset={state.activeAsset} timeframe={state.activeTf} flex />

      {/* AC indicator box */}
      <div style={{ background:"#0D1117", borderTop:"1px solid rgba(0,229,255,0.1)", flexShrink:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 10px 0" }}>
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"10px", color:"#607080", letterSpacing:".1em" }}>AC</span>
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"11px", color: acBull ? "#00FF88" : "#FF3B5C" }}>
            {ac >= 0 ? "+" : ""}{ac.toFixed(4)}
          </span>
        </div>
        <OscillatorChart values={acHist} type="ac" />
      </div>

      {/* AO indicator box */}
      <div style={{ background:"#0D1117", borderTop:"1px solid rgba(0,229,255,0.08)", flexShrink:0 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"4px 10px 0" }}>
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"10px", color:"#607080", letterSpacing:".1em" }}>AO</span>
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"11px", color: aoBull ? "#00FF88" : "#FF3B5C" }}>
            {ao >= 0 ? "+" : ""}{ao.toFixed(4)}
          </span>
        </div>
        <OscillatorChart values={aoHist} type="ao" />
      </div>

      {/* Signal bottom bar */}
      <div style={{
        flexShrink:0, padding:"12px 16px",
        background: dir === "BUY" ? "rgba(0,255,136,0.08)" : dir === "SELL" ? "rgba(255,59,92,0.08)" : "rgba(10,13,18,0.98)",
        borderTop:`1px solid ${dir === "BUY" ? "rgba(0,255,136,0.35)" : dir === "SELL" ? "rgba(255,59,92,0.35)" : "rgba(0,229,255,0.1)"}`,
        display:"flex", alignItems:"center", justifyContent:"center", gap:"12px",
      }}>
        <span style={{ fontSize:"20px" }}>{dir === "BUY" ? "▲" : dir === "SELL" ? "▼" : "◈"}</span>
        <span style={{ fontFamily:"'Orbitron',monospace", fontSize:"20px", fontWeight:900, letterSpacing:".25em", color: dir === "BUY" ? "#00FF88" : dir === "SELL" ? "#FF3B5C" : "#607080" }}>
          {dir || "SCANNING"}
        </span>
      </div>
    </div>
  );
}
