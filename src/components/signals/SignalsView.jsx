import { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import OscillatorChart from "./OscillatorChart";
import StatusRibbon from "../layout/StatusRibbon";

const ASSETS = [
  { key: "BOOM_1000", label: "BOOM 1000" },
  { key: "CRASH_1000", label: "CRASH 1000" },
];

export default function SignalsView() {
  const { state, dispatch, connectDeriv, subscribeToAsset } = useApp();
  const [aoHistory, setAoHistory] = useState(Array(40).fill(0));
  const [acHistory, setAcHistory] = useState(Array(40).fill(0));
  const [liveTick, setLiveTick] = useState("—");
  const wsRef = useRef(null);

  useEffect(() => {
    setAoHistory(prev => [...prev.slice(1), state.signals.ao]);
    setAcHistory(prev => [...prev.slice(1), state.signals.ac]);
    if (state.signals.lastCandle) setLiveTick(state.signals.lastCandle);
  }, [state.signals.ao, state.signals.ac]);

  const handleAssetChange = (key) => {
    dispatch({ type: "SET_ASSET", payload: key });
    subscribeToAsset(key);
  };

  const isBuy = state.signals.direction === "BUY";
  const isSell = state.signals.direction === "SELL";
  const ao = state.signals.ao || 0;
  const ac = state.signals.ac || 0;

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

      {/* Live Tick */}
      <div className="tick-display">
        <div className="tick-label">LIVE TICK</div>
        <div className="tick-value">{liveTick}</div>
        <div className="tick-asset">{state.activeAsset.replace("_", " ")}</div>
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

      {/* Signal Directive */}
      <div className={`signal-badge ${isBuy ? "signal-buy" : isSell ? "signal-sell" : "signal-neutral"}`}>
        <span className="signal-arrow">{isBuy ? "▲" : isSell ? "▼" : "◈"}</span>
        <span className="signal-word">{isBuy ? "BUY" : isSell ? "SELL" : "SCANNING"}</span>
        <div className="signal-values">
          AO {ao >= 0 ? "+" : ""}{ao.toFixed(4)} | AC {ac >= 0 ? "+" : ""}{ac.toFixed(4)}
        </div>
      </div>

      {/* Manual Parameters */}
      <div className="params-block">
        <div className="param-group">
          <label className="param-label">LOT SIZE</label>
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
        <div className="param-group">
          <label className="param-label">POSITION COUNT</label>
          <div className="param-input-row">
            <button className="param-step" onClick={() => dispatch({ type: "SET_POS_COUNT", payload: Math.max(1, state.positionCount - 1) })}>−</button>
            <input
              className="param-input"
              type="number"
              min="1" step="1"
              value={state.positionCount}
              onChange={e => dispatch({ type: "SET_POS_COUNT", payload: parseInt(e.target.value) || 1 })}
            />
            <button className="param-step" onClick={() => dispatch({ type: "SET_POS_COUNT", payload: state.positionCount + 1 })}>+</button>
          </div>
        </div>
      </div>

      <StatusRibbon />
    </div>
  );
}
