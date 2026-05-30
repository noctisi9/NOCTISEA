import { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import CandleChart from "../trading/CandleChart";
import StatusRibbon from "../layout/StatusRibbon";

export default function Page0_Chart() {
  const { state } = useApp();
  const dir = state.signals.direction;
  const ao  = state.signals.ao || 0;
  const ac  = state.signals.ac || 0;

  return (
    <div className="page-container">
      <CandleChart
        candles={state.candles}
        currentPrice={state.currentPrice}
        asset={state.activeAsset}
        timeframe={state.activeTf}
        fullHeight
      />
      <div className="signal-strip">
        <div className={`signal-box ${dir === "BUY" ? "buy" : dir === "SELL" ? "sell" : "neutral"}`}>
          <span className="sig-arrow">{dir === "BUY" ? "▲" : dir === "SELL" ? "▼" : "◈"}</span>
          <span className="sig-word">{dir || "SCANNING"}</span>
          {!state.signals.safe && state.signals.e1Signal && (
            <span className="sig-warn">⚠ {state.signals.reason}</span>
          )}
        </div>
      </div>
      <StatusRibbon />
    </div>
  );
}
