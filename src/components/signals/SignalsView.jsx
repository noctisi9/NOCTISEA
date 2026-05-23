import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";
import OscillatorChart from "./OscillatorChart";
import CandleChart from "./CandleChart";
import StatusRibbon from "../layout/StatusRibbon";

const ASSETS = [
  { key: "BOOM_1000", label: "BOOM 1000" },
  { key: "CRASH_1000", label: "CRASH 1000" },
];

export default function SignalsView() {
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

  const isBuy  = state.signals.direction === "BUY";
  const isSell = state.signals.direction === "SELL";
  const ao     = state.signals.ao || 0;
  const ac     = state.signals.ac || 0;

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

      {/* Manual Parameters */}
      <div className="params-block">
        <div className="param-group">
          <label className="param-label">LOT SIZE</label>
          <div className="param-input-row">
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
        <div className="param-group">
          <label className="param-label">POSITION COUNT</label>
          <div className="param-input-row">
            <button className="param-step" onClick={() => dispatch({ type: "SET_POSITION_COUNT", payload: Math.max(1, state.positionCount - 1) })}>−</button>
            <input
              className="param-input"
              type="number"
              min="1" step="1"
              value={state.positionCount}
              onChange={e => dispatch({ type: "SET_POSITION_COUNT", payload: parseInt(e.target.value) || 1 })}
            />
            <button className="param-step" onClick={() => dispatch({ type: "SET_POSITION_COUNT", payload: state.positionCount + 1 })}>+</button>
          </div>
        </div>
      </div>

      <StatusRibbon />
    </div>
  );
}
