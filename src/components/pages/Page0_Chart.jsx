import { useApp } from "../../context/AppContext";
import CandleChart from "../trading/CandleChart";

export default function Page0_Chart() {
  const { state } = useApp();
  const dir = state.signals.direction;
  const isBuy  = dir === "BUY";
  const isSell = dir === "SELL";
  const isSpike = state.signals.spikeWarning;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <CandleChart
        candles={state.candles}
        currentPrice={state.currentPrice}
        asset={state.activeAsset}
        timeframe={state.activeTf}
        flex
      />
      <div style={{
        flexShrink:0, padding:"14px 16px",
        background: isSpike ? "rgba(255,214,0,0.12)" : isBuy ? "rgba(0,255,136,0.08)" : isSell ? "rgba(255,59,92,0.08)" : "rgba(10,13,18,0.98)",
        borderTop: `1px solid ${isSpike ? "rgba(255,214,0,0.4)" : isBuy ? "rgba(0,255,136,0.35)" : isSell ? "rgba(255,59,92,0.35)" : "rgba(0,229,255,0.1)"}`,
        display:"flex", alignItems:"center", justifyContent:"center", gap:"12px",
      }}>
        <span style={{ fontSize:"22px" }}>
          {isSpike ? "⚡" : isBuy ? "▲" : isSell ? "▼" : "◈"}
        </span>
        <span style={{
          fontFamily:"'Orbitron',monospace", fontSize:"22px", fontWeight:900, letterSpacing:"0.25em",
          color: isSpike ? "#FFD600" : isBuy ? "#00FF88" : isSell ? "#FF3B5C" : "#607080",
        }}>
          {isSpike ? "SPIKE WARNING" : dir || "SCANNING"}
        </span>
      </div>
    </div>
  );
}
