import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import OscillatorChart from "../trading/OscillatorChart";

export default function Page1_Indicators() {
  const { state } = useApp();
  const [aoHist, setAoHist] = useState(Array(120).fill(0));
  const [acHist, setAcHist] = useState(Array(120).fill(0));

  useEffect(() => {
    setAoHist(p => [...p.slice(1), state.signals.ao || 0]);
    setAcHist(p => [...p.slice(1), state.signals.ac || 0]);
  }, [state.signals.ao, state.signals.ac]);

  const ao     = state.signals.ao || 0;
  const ac     = state.signals.ac || 0;
  const dir    = state.signals.direction;
  const aoBull = ao >= 0;
  const acBull = ac >= 0;

  const panelStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "#0A0D12",
    borderBottom: "1px solid rgba(201,168,76,0.08)",
    minHeight: 0,
  };

  const headerStyle = {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "5px 10px 3px",
    background: "#0D1117",
    borderBottom: "1px solid rgba(201,168,76,0.07)",
    flexShrink: 0,
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {/* AC Panel */}
      <div style={panelStyle}>
        <div style={headerStyle}>
          {/* Label intentionally hidden — value only */}
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"9px", color:"rgba(201,168,76,0.2)", letterSpacing:".2em" }}>
            ···
          </span>
          <span style={{
            fontFamily:"'Share Tech Mono',monospace", fontSize:"13px", fontWeight:700,
            color: acBull ? "#C9A84C" : "#2979FF",
          }}>
            {ac >= 0 ? "+" : ""}{ac.toFixed(6)}
          </span>
        </div>
        <div style={{ flex:1, minHeight:0 }}>
          <OscillatorChart values={acHist} type="ac" />
        </div>
      </div>

      {/* AO Panel */}
      <div style={{ ...panelStyle, borderBottom:"none" }}>
        <div style={headerStyle}>
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"9px", color:"rgba(201,168,76,0.2)", letterSpacing:".2em" }}>
            ···
          </span>
          <span style={{
            fontFamily:"'Share Tech Mono',monospace", fontSize:"13px", fontWeight:700,
            color: aoBull ? "#C9A84C" : "#2979FF",
          }}>
            {ao >= 0 ? "+" : ""}{ao.toFixed(6)}
          </span>
        </div>
        <div style={{ flex:1, minHeight:0 }}>
          <OscillatorChart values={aoHist} type="ao" />
        </div>
      </div>

      {/* Signal strip */}
      <div style={{
        flexShrink:0, padding:"12px 16px",
        background: dir==="BUY" ? "rgba(201,168,76,0.1)" : dir==="SELL" ? "rgba(41,121,255,0.1)" : "rgba(10,13,18,0.98)",
        borderTop:`1px solid ${dir==="BUY"?"rgba(201,168,76,0.4)":dir==="SELL"?"rgba(41,121,255,0.4)":"rgba(201,168,76,0.1)"}`,
        display:"flex", alignItems:"center", justifyContent:"center", gap:"14px",
      }}>
        <span style={{ fontSize:"22px" }}>{dir==="BUY"?"▲":dir==="SELL"?"▼":"◈"}</span>
        <span style={{
          fontFamily:"'Orbitron',monospace", fontSize:"22px", fontWeight:900, letterSpacing:".3em",
          color: dir==="BUY"?"#C9A84C":dir==="SELL"?"#2979FF":"#607080",
        }}>{dir||"SCANNING"}</span>
      </div>
    </div>
  );
}
