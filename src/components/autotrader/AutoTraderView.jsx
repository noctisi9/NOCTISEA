import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import OscillatorChart from "../signals/OscillatorChart";
import CandleChart from "../signals/CandleChart";
import StatusRibbon from "../layout/StatusRibbon";

const ASSETS = [
  { key: "BOOM_1000", label: "BOOM 1000" },
  { key: "CRASH_1000", label: "CRASH 1000" },
];

export default function AutoTraderView() {
  const { state, dispatch, subscribeToAsset } = useApp();
  const [aoHistory, setAoHistory] = useState(Array(50).fill(0));
  const [acHistory, setAcHistory] = useState(Array(50).fill(0));

  useEffect(() => {
    setAoHistory(prev => [...prev.slice(1), state.signals.ao || 0]);
    setAcHistory(prev => [...prev.slice(1), state.signals.ac || 0]);
  }, [state.signals.ao, state.signals.ac]);

  const handleAssetChange = (key) => {
    dispatch({ type: "SET_ASSET", payload: key });
    subscribeToAsset(key);
  };

  const handleStart = () => {
    dispatch({ type: "SET_AUTOTRADER", payload: true });
    dispatch({ type: "CLEAR_MARGIN_ERROR" });
  };

  const handleStop = () => {
    dispatch({ type: "SET_AUTOTRADER", payload: false });
    dispatch({ type: "SET_CANDLE", payload: { count: 0, phase: "waiting" } });
  };

  const isBuy  = state.signals.direction === "BUY";
  const isSell = state.signals.direction === "SELL";
  const ao     = state.signals.ao || 0;
  const ac     = state.signals.ac || 0;

  const phaseLabels = {
    waiting:    "WAITING FOR SIGNAL",
    confirming: `CONFIRMING · CANDLE ${state.candle.count}/3`,
    entry:      "ENTRY CANDLE — FIRING ORDERS",
    holding:    `HOLDING · CANDLE ${state.candle.count}/5`,
  };

  return (
    <div className="view-container">
      {/* Asset Selector */}
      <div className="asset-tabs">
        {ASSETS.map(a => (
          <button
            key={a.key}
            className={`asset-tab ${state.activeAsset === a.key ? "asset-tab-active" : ""}`}
            onClick={() => handleAssetChange(a.key)}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Engine Status */}
      <div className={`engine-status ${state.autoTraderActive ? "engine-active" : "engine-idle"}`}>
        <span className={`engine-dot ${state.autoTraderActive ? "edot-live" : "edot-off"}`} />
        <span>{state.autoTraderActive
          ? (phaseLabels[state.candle.phase] || "ENGINE ACTIVE · MONITORING")
          : "ENGINE IDLE"
        }</span>
      </div>

      {/* Live M1 Candlestick Chart */}
      <CandleChart
        candles={state.candles}
        currentPrice={state.currentPrice}
        asset={state.activeAsset}
      />

      {/* AC Oscillator */}
      <div className="indicator-block">
        <div className="indicator-label-row">
          <span className="ind-name">AC</span>
          <span className={`ind-val ${ac >= 0 ? "val-pos" : "val-neg"}`}>
            {ac >= 0 ? "+" : ""}{ac.toFixed(4)}
          </span>
        </div>
        <OscillatorChart values={acHistory} />
      </div>

      {/* AO Oscillator */}
      <div className="indicator-block">
        <div className="indicator-label-row">
          <span className="ind-name">AO</span>
          <span className={`ind-val ${ao >= 0 ? "val-pos" : "val-neg"}`}>
            {ao >= 0 ? "+" : ""}{ao.toFixed(4)}
          </span>
        </div>
        <OscillatorChart values={aoHistory} />
      </div>

      {/* Signal Badge */}
      <div className={`signal-badge ${isBuy ? "signal-buy" : isSell ? "signal-sell" : "signal-neutral"}`}>
        <span className="signal-arrow">{isBuy ? "▲" : isSell ? "▼" : "◈"}</span>
        <span className="signal-word">{isBuy ? "BUY" : isSell ? "SELL" : "SCANNING"}</span>
        <div className="signal-values">
          AO {ao >= 0 ? "+" : ""}{ao.toFixed(4)} | AC {ac >= 0 ? "+" : ""}{ac.toFixed(4)}
        </div>
      </div>

      {/* Lot Size */}
      <div className="param-group" style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "12px" }}>
        <label className="param-label">LOT SIZE</label>
        <div className="param-sublabel">Position count auto-scaled by margin</div>
        <div className="param-input-row" style={{ marginTop: "8px" }}>
          <button className="param-step" onClick={() => dispatch({ type: "SET_LOTSIZE", payload: Math.max(0.01, parseFloat((state.lotSize - 0.01).toFixed(2))) })}>−</button>
          <input
            className="param-input"
            type="number"
            min="0.01" step="0.01"
            value={state.lotSize}
            onChange={e => dispatch({ type: "SET_LOTSIZE", payload: parseFloat(e.target.value) || 0.01 })}
          />
          <button className="param-step" onClick={() => dispatch({ type: "SET_LOTSIZE", payload: parseFloat((state.lotSize + 0.01).toFixed(2)) })}>+</button>
        </div>
      </div>

      {/* Candle Phase Dots */}
      {state.autoTraderActive && (
        <div className="candle-counter">
          <span className="cc-label">CANDLE PHASE</span>
          <div className="cc-dots">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`cc-dot ${i < (state.candle.count || 0) ? "cc-filled" : ""}`} />
            ))}
          </div>
          <span className="cc-phase">{(state.candle.phase || "waiting").toUpperCase()}</span>
        </div>
      )}

      {/* START / STOP */}
      <div className="exec-controls">
        <button
          className={`exec-start ${state.autoTraderActive ? "exec-start-disabled" : ""}`}
          onClick={handleStart}
          disabled={state.autoTraderActive}
        >
          <span className="exec-icon">■</span> START
        </button>
        <button
          className={`exec-stop ${!state.autoTraderActive ? "exec-stop-disabled" : ""}`}
          onClick={handleStop}
          disabled={!state.autoTraderActive}
        >
          <span className="exec-icon">●</span> STOP
        </button>
      </div>

      <StatusRibbon />
    </div>
  );
}
