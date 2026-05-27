import { useState, useEffect, useRef } from "react";
import { useApp } from "../../context/AppContext";
import CandleChart from "./CandleChart";
import OscillatorChart from "./OscillatorChart";
import StatusRibbon from "../layout/StatusRibbon";

const ASSETS = [
  { key: "BOOM_1000",  label: "BOOM 1000" },
  { key: "CRASH_1000", label: "CRASH 1000" },
];

export default function TradingView() {
  const { state, dispatch, subscribeToAsset } = useApp();
  const [aoHist, setAoHist] = useState(Array(80).fill(0));
  const [acHist, setAcHist] = useState(Array(80).fill(0));
  const prevPrice = useRef(0);
  const [priceDir, setPriceDir] = useState("flat");

  useEffect(() => {
    setAoHist(p => [...p.slice(1), state.signals.ao || 0]);
    setAcHist(p => [...p.slice(1), state.signals.ac || 0]);
  }, [state.signals.ao, state.signals.ac]);

  useEffect(() => {
    if (state.currentPrice > prevPrice.current) setPriceDir("up");
    else if (state.currentPrice < prevPrice.current) setPriceDir("down");
    prevPrice.current = state.currentPrice;
  }, [state.currentPrice]);

  const handleAsset = (key) => {
    dispatch({ type: "SET_ASSET", payload: key });
    subscribeToAsset(key);
  };

  const ao  = state.signals.ao || 0;
  const ac  = state.signals.ac || 0;
  const dir = state.signals.direction;

  return (
    <div className="trading-view">

      {/* Asset selector + live price */}
      <div className="asset-bar">
        {ASSETS.map(a => (
          <button key={a.key}
            className={`asset-btn ${state.activeAsset === a.key ? "active" : ""}`}
            onClick={() => handleAsset(a.key)}>
            {a.label}
          </button>
        ))}
        <div className="price-display">
          <div className={`price-val ${priceDir}`}>
            {state.currentPrice ? state.currentPrice.toFixed(2) : "—"}
          </div>
          <div className="price-chg">{state.activeAsset.replace("_", " ")}</div>
        </div>
      </div>

      {/* Candlestick chart */}
      <CandleChart
        candles={state.candles}
        currentPrice={state.currentPrice}
        asset={state.activeAsset}
      />

      {/* AC oscillator — label top-left, no name shown */}
      <div className="osc-block">
        <div className={`osc-val ${ac >= 0 ? "pos" : "neg"}`}>
          {ac >= 0 ? "+" : ""}{ac.toFixed(4)}
        </div>
        <OscillatorChart values={acHist} type="ac" />
      </div>

      {/* AO oscillator — label top-left, no name shown */}
      <div className="osc-block">
        <div className={`osc-val ${ao >= 0 ? "pos" : "neg"}`}>
          {ao >= 0 ? "+" : ""}{ao.toFixed(4)}
        </div>
        <OscillatorChart values={aoHist} type="ao" />
      </div>

      {/* Signal strip — word only, no AO/AC text */}
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
