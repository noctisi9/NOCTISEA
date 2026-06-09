import { useApp } from "../../context/AppContext";
import CandleChart from "../trading/CandleChart";

export default function Page0_Chart({ onNext, pageIndex = 0, totalPages = 6 }) {
  const { state } = useApp();
  const dir      = state.signals.direction;
  const isBuy    = dir === "BUY";
  const isSell   = dir === "SELL";
  const isSpike  = state.signals.spikeWarning;
  const asset    = state.activeAsset?.replace("_", " ") || "BOOM 1000";

  const signalLabel = isSpike ? "SPIKE WARNING" : dir || "SCANNING";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", position: "relative", background: "#0A0A0A" }}>

      {/* Chart */}
      <CandleChart
        candles={state.candles}
        currentPrice={state.currentPrice}
        asset={state.activeAsset}
        timeframe={state.activeTf}
        flex
      />

      {/* Right-side dot nav */}
      <div style={{
        position: "absolute", right: 10, top: "50%",
        transform: "translateY(-50%)",
        display: "flex", flexDirection: "column", gap: 7, zIndex: 20,
      }}>
        {Array.from({ length: totalPages }).map((_, i) => (
          <div key={i} style={{
            width: i === pageIndex ? 8 : 6,
            height: i === pageIndex ? 8 : 6,
            borderRadius: "50%",
            background: i === pageIndex ? "#FFFFFF" : "rgba(255,255,255,0.25)",
            transition: "all 0.2s",
          }} />
        ))}
        {/* Next arrow */}
        {onNext && (
          <button onClick={onNext} style={{
            marginTop: 8,
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "#fff", fontSize: 14,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer",
          }}>›</button>
        )}
      </div>

      {/* Bottom info + signal */}
      <div style={{
        flexShrink: 0,
        background: "#111111",
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}>
        {/* Asset context row */}
        <div style={{
          padding: "10px 16px 8px",
          display: "flex", flexDirection: "column", gap: 2,
        }}>
          <div style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: 12, fontWeight: 700,
            color: "#FFFFFF", letterSpacing: "0.1em",
          }}>{asset}</div>
          <div style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 10, color: "rgba(255,255,255,0.35)",
            letterSpacing: "0.05em",
          }}>
            {isSpike
              ? "⚡ SPIKE DETECTED — COOL DOWN PHASE"
              : "10 CANDLES CREATED AFTER A SPIKE"}
          </div>
        </div>

        {/* Signal bar */}
        <div style={{
          padding: "14px 16px",
          background: isSpike
            ? "rgba(255,255,255,0.12)"
            : isBuy ? "rgba(255,255,255,0.09)"
            : isSell ? "rgba(255,255,255,0.04)"
            : "rgba(255,255,255,0.03)",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
          borderTop: "1px solid rgba(255,255,255,0.06)",
        }}>
          <div style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: 22, fontWeight: 900,
            letterSpacing: "0.25em",
            color: isSpike ? "#FFFFFF"
              : isBuy ? "#FFFFFF"
              : isSell ? "rgba(255,255,255,0.5)"
              : "rgba(255,255,255,0.25)",
            textShadow: (isBuy || isSpike) ? "0 0 20px rgba(255,255,255,0.3)" : "none",
          }}>
            {signalLabel}
          </div>
        </div>
      </div>
    </div>
  );
}
