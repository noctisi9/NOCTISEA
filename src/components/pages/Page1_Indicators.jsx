import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import CandleChart from "../trading/CandleChart";
import OscillatorChart from "../trading/OscillatorChart";
import StatusRibbon from "../layout/StatusRibbon";

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

  return (
    <div className="page-container">
      <CandleChart
        candles={state.candles}
        currentPrice={state.currentPrice}
        asset={state.activeAsset}
        timeframe={state.activeTf}
      />

      {/* AC oscillator */}
      <div className="osc-block">
        <div className="osc-header">
          <span className="osc-name">AC</span>
          <span className={`osc-val ${ac >= 0 ? "pos" : "neg"}`}>
            {ac >= 0 ? "+" : ""}{ac.toFixed(4)}
          </span>
        </div>
        <OscillatorChart values={acHist} type="ac" />
      </div>

      {/* AO oscillator */}
      <div className="osc-block">
        <div className="osc-header">
          <span className="osc-name">AO</span>
          <span className={`osc-val ${ao >= 0 ? "pos" : "neg"}`}>
            {ao >= 0 ? "+" : ""}{ao.toFixed(4)}
          </span>
        </div>
        <OscillatorChart values={aoHist} type="ao" />
      </div>

      <div className="signal-strip">
        <div className={`signal-box ${dir === "BUY" ? "buy" : dir === "SELL" ? "sell" : "neutral"}`}>
          <span className="sig-arrow">{dir === "BUY" ? "▲" : dir === "SELL" ? "▼" : "◈"}</span>
          <span className="sig-word">{dir || "SCANNING"}</span>
        </div>
      </div>
      <StatusRibbon />
    </div>
  );
}
