import { useApp } from "../../context/AppContext";
import CandleChart from "../trading/CandleChart";

export default function Page0_Chart() {
  const { state } = useApp();
  const dir     = state.signals.direction;
  const isSpike = state.signals.spikeWarning;
  const isBuy   = dir === "BUY";
  const isSell  = dir === "SELL";

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <CandleChart
        candles={state.candles}
        currentPrice={state.currentPrice}
        asset={state.activeAsset}
        timeframe={state.activeTf}
        flex
      />
      {/* Signal strip */}
      <div style={{
        flexShrink:0, padding:"14px 16px",
        background: isSpike ? "rgba(255,214,0,0.1)" : isBuy ? "rgba(201,168,76,0.1)" : isSell ? "rgba(41,121,255,0.1)" : "rgba(10,13,18,0.98)",
        borderTop:`1px solid ${isSpike?"rgba(255,214,0,0.4)":isBuy?"rgba(201,168,76,0.4)":isSell?"rgba(41,121,255,0.4)":"rgba(201,168,76,0.12)"}`,
        display:"flex", alignItems:"center", justifyContent:"center", gap:"14px",
      }}>
        <span style={{ fontSize:"22px" }}>{isSpike?"⚡":isBuy?"▲":isSell?"▼":"◈"}</span>
        <span style={{
          fontFamily:"'Orbitron',monospace", fontSize:"22px", fontWeight:900, letterSpacing:".25em",
          color: isSpike?"#FFD600":isBuy?"#C9A84C":isSell?"#2979FF":"#607080",
        }}>{isSpike?"SPIKE WARNING":dir||"SCANNING"}</span>
      </div>
    </div>
  );
}
