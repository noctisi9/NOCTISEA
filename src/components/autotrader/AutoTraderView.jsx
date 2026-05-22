import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import OscillatorChart from "../signals/OscillatorChart";
import StatusRibbon from "../layout/StatusRibbon";

const ASSETS = [
  { key: "BOOM_1000", label: "BOOM 1000" },
  { key: "CRASH_1000", label: "CRASH 1000" },
];

export default function AutoTraderView() {
  const { state, dispatch, subscribeToAsset } = useApp();
  const [aoHistory, setAoHistory] = useState(Array(40).fill(0));
  const [acHistory, setAcHistory] = useState(Array(40).fill(0));

  useEffect(() => {
    setAoHistory(prev => [...prev.slice(1), state.signals.ao]);
    setAcHistory(prev => [...prev.slice(1), state.signals.ac]);
  }, [state.signals.ao, state.signals.ac]);

  const handleAssetChange = (key) => {
    dispatch({ type: "SET_ASSET", payload: key });
    subscribeToAsset(key);
  };

  const handleStart = () => {
    dispatch({ type: "SET_AUTO_ACTIVE", payload: true });
  };

  const handleStop = () => {
    dispatch({ type: "SET_AUTO_ACTIVE", payload: false });
  };

  const ao = state.signals.ao || 0;
  const ac = state.signals.ac || 0;
  const isBuy = state.signals.direction === "BUY";
  const isSell = state.signals.direction === "SELL";

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
        <span>{state.autoTraderActive ? "ENGINE ACTIVE · MONITORING" : "ENGINE IDLE"}</span>
      </div>

      {/* AO Chart */}
      <div className="indicator-block">
        <OscillatorChart values={aoHistory} color="#D4AF37" />
        <div className="indicator-footer">
          <span className="ind-name">AO</span>
          <span className={`ind-val ${ao >= 0 ? "val-pos" : "val-neg"}`}>
            {ao >= 0 ? "+" : ""}{ao.toFixed(6)}
          </span>
        </div>
      </div>

      {/* AC Chart */}
      <div className="indicator-block">
        <OscillatorChart values={acHistory} color="#AA7C11" />
        <div className="indicator-footer">
          <span className="ind-name">AC</span>
          <span className={`ind-val ${ac >= 0 ? "val-pos" : "val-neg"}`}>
            {ac >= 0 ? "+" : ""}{ac.toFixed(6)}
          </span>
        </div>
      </div>

      {/* Signal Badge */}
      <div className={`signal-badge ${isBuy ? "signal-buy" : isSell ? "signal-sell" : "signal-neutral"}`}>
        <span className="signal-arrow">{isBuy ? "▲" : isSell ? "▼" : "◈"}</span>
        <span className="signal-word">{isBuy ? "BUY" : isSell ? "SELL" : "SCANNING"}</span>
        <div className="signal-values">
          AO {ao >= 0 ? "+" : ""}{ao.toFixed(4)} | AC {ac >= 0 ? "+" : ""}{ac.toFixed(4)}
        </div>
      </div>

      {/* Lot Size only (auto position sizing) */}
      <div className="params-block">
        <div className="param-group">
          <label className="param-label">LOT SIZE</label>
          <div className="param-sublabel">Position count auto-scaled by margin</div>
          <div className="param-input-row">
            <button className="param-step" onClick={() => dispatch({ type: "SET_LOT_SIZE", payload: Math.max(0.01, state.lotSize - 0.01) })}>−</button>
            <input
              className="param-input"
              type="number"
              min="0.01" step="0.01"
              value={state.lotSize}
              onChange={e => dispatch({ type: "SET_LOT_SIZE", payload: parseFloat(e.target.value) || 0.01 })}
            />
            <button className="param-step" onClick={() => dispatch({ type: "SET_LOT_SIZE", payload: state.lotSize + 0.01 })}>+</button>
          </div>
        </div>
      </div>

      {/* Execution Controls */}
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

      {/* Candle counter if active */}
      {state.autoTraderActive && (
        <div className="candle-counter">
          <span className="cc-label">CANDLE PHASE</span>
          <div className="cc-dots">
            {Array.from({ length: 5 }).map((_, i) => (
              <span key={i} className={`cc-dot ${i < (state.candle.count || 0) ? "cc-filled" : ""}`} />
            ))}
          </div>
          <span className="cc-phase">{state.candle.phase?.toUpperCase() || "WAITING"}</span>
        </div>
      )}

      <StatusRibbon />
    </div>
  );
}
