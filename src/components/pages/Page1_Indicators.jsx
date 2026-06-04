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

  const ao     = state.signals.ao || 0;
  const ac     = state.signals.ac || 0;
  const dir    = state.signals.direction;
  const aoBull = ao > 0;
  const acBull = ac > 0;

  const panel = {
    background: "#0D1117",
    borderTop: "1px solid rgba(201,168,76,0.12)",
    flexShrink: 0,
  };

  const headerRow = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "5px 10px 2px",
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {/* Candle chart top */}
      <CandleChart candles={state.candles} currentPrice={state.currentPrice} asset={state.activeAsset} timeframe={state.activeTf} flex />

      {/* AC Panel — MT5 style */}
      <div style={panel}>
        <div style={headerRow}>
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"10px", color:"rgba(201,168,76,0.6)", letterSpacing:".15em" }}>
            AC
          </span>
          <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"9px", color:"rgba(201,168,76,0.35)" }}>
              Accelerator Oscillator
            </span>
            <span style={{
              fontFamily:"'Share Tech Mono',monospace", fontSize:"12px", fontWeight:700,
              color: acBull ? "#C9A84C" : "#2979FF",
              background: acBull ? "rgba(201,168,76,0.08)" : "rgba(41,121,255,0.08)",
              padding: "1px 6px", borderRadius: "2px",
            }}>
              {ac >= 0 ? "+" : ""}{ac.toFixed(5)}
            </span>
          </div>
        </div>
        <OscillatorChart values={acHist} type="ac" />
      </div>

      {/* AO Panel — MT5 style */}
      <div style={{ ...panel, borderTop:"1px solid rgba(201,168,76,0.07)" }}>
        <div style={headerRow}>
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"10px", color:"rgba(201,168,76,0.6)", letterSpacing:".15em" }}>
            AO
          </span>
          <div style={{ display:"flex", gap:"8px", alignItems:"center" }}>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"9px", color:"rgba(201,168,76,0.35)" }}>
              Awesome Oscillator
            </span>
            <span style={{
              fontFamily:"'Share Tech Mono',monospace", fontSize:"12px", fontWeight:700,
              color: aoBull ? "#C9A84C" : "#2979FF",
              background: aoBull ? "rgba(201,168,76,0.08)" : "rgba(41,121,255,0.08)",
              padding: "1px 6px", borderRadius: "2px",
            }}>
              {ao >= 0 ? "+" : ""}{ao.toFixed(5)}
            </span>
          </div>
        </div>
        <OscillatorChart values={aoHist} type="ao" />
      </div>

      {/* Signal button bottom */}
      <div style={{
        flexShrink: 0, padding: "12px 16px",
        background: dir==="BUY" ? "rgba(201,168,76,0.1)" : dir==="SELL" ? "rgba(41,121,255,0.1)" : "rgba(10,13,18,0.98)",
        borderTop: `1px solid ${dir==="BUY" ? "rgba(201,168,76,0.4)" : dir==="SELL" ? "rgba(41,121,255,0.4)" : "rgba(201,168,76,0.1)"}`,
        display: "flex", alignItems: "center", justifyContent: "center", gap: "14px",
      }}>
        <span style={{ fontSize:"22px" }}>{dir==="BUY" ? "▲" : dir==="SELL" ? "▼" : "◈"}</span>
        <span style={{
          fontFamily:"'Orbitron',monospace", fontSize:"22px", fontWeight:900, letterSpacing:".3em",
          color: dir==="BUY" ? "#C9A84C" : dir==="SELL" ? "#2979FF" : "#607080",
        }}>{dir || "SCANNING"}</span>
      </div>
    </div>
  );
}
