import { useApp } from "../../context/AppContext";
import StatusRibbon from "../layout/StatusRibbon";

export default function Page3_TickEngine() {
  const { state } = useApp();
  const ts  = state.tickStats;
  const wf  = state.welford;
  const dir = state.signals.direction;
  const total = (ts.bullTicks || 0) + (ts.bearTicks || 0);
  const bullW = total > 0 ? (ts.bullTicks / total * 100) : 50;
  const bearW = 100 - bullW;

  return (
    <div className="page-container">
      <div className="tick-header">
        <span className="tick-title">TICK ENGINE</span>
        <span className="tick-sub">{state.activeAsset.replace("_"," ")} · WELFORD</span>
      </div>

      {/* Hz display */}
      <div className="hz-display">
        <span className="hz-val">{ts.hz || 0}</span>
        <span className="hz-unit">TICKS / SEC</span>
      </div>

      {/* Bull / Bear bar */}
      <div className="dir-bar-wrap">
        <div className="dir-label-row">
          <span className="dir-bull">▲ {ts.bullPct || 50}%</span>
          <span className="dir-bear">{ts.bearPct || 50}% ▼</span>
        </div>
        <div className="dir-bar">
          <div className="dir-bar-bull" style={{ width: `${bullW}%` }} />
          <div className="dir-bar-bear" style={{ width: `${bearW}%` }} />
        </div>
        <div className="dir-counts">
          <span className="dir-bull">{ts.bullTicks || 0} UP</span>
          <span className="dir-bear">{ts.bearTicks || 0} DOWN</span>
        </div>
      </div>

      {/* Welford stats */}
      <div className="welford-grid">
        <div className="wf-card">
          <span className="wf-lbl">STD DEV σ</span>
          <span className="wf-val">{(wf.stdDev || 0).toFixed(4)}</span>
        </div>
        <div className="wf-card">
          <span className="wf-lbl">MEAN μ</span>
          <span className="wf-val">{(wf.mean || 0).toFixed(2)}</span>
        </div>
        <div className="wf-card">
          <span className="wf-lbl">AVG VELOCITY</span>
          <span className="wf-val">{(ts.avgVelocity || 0).toFixed(5)}</span>
        </div>
        <div className={`wf-card ${wf.compressionWarning ? "wf-alert" : ""}`}>
          <span className="wf-lbl">COMPRESSION</span>
          <span className={`wf-val ${wf.compressionWarning ? "neg" : "pos"}`}>
            {wf.compressionWarning ? "⚠ WARNING" : "NORMAL"}
          </span>
        </div>
      </div>

      {/* Engine status */}
      <div className="engine-grid">
        <div className={`eng-card ${state.signals.e1Signal ? "eng-on" : ""}`}>
          <span className="eng-lbl">ENGINE 1</span>
          <span className="eng-val">AO/AC</span>
          <span className={`eng-status ${state.signals.e1Signal ? "pos" : "neg"}`}>
            {state.signals.e1Signal || "WAITING"}
          </span>
        </div>
        <div className={`eng-card ${state.signals.e2Safe ? "eng-on" : "eng-warn"}`}>
          <span className="eng-lbl">ENGINE 2</span>
          <span className="eng-val">ORDERFLOW</span>
          <span className={`eng-status ${state.signals.e2Safe !== false ? "pos" : "neg"}`}>
            {state.signals.e2Safe === false ? "BLOCKED" : "CLEAR"}
          </span>
        </div>
        <div className={`eng-card ${!wf.compressionWarning ? "eng-on" : "eng-warn"}`}>
          <span className="eng-lbl">ENGINE 3</span>
          <span className="eng-val">WELFORD</span>
          <span className={`eng-status ${!wf.compressionWarning ? "pos" : "neg"}`}>
            {wf.compressionWarning ? "COMPRESS" : "STABLE"}
          </span>
        </div>
      </div>

      <div className="signal-strip">
        <div className={`signal-box ${dir === "BUY" ? "buy" : dir === "SELL" ? "sell" : "neutral"}`}>
          <span className="sig-arrow">{dir === "BUY" ? "▲" : dir === "SELL" ? "▼" : "◈"}</span>
          <span className="sig-word">{dir || "SCANNING"}</span>
          {state.signals.reason && (
            <span className="sig-vals">{state.signals.reason}</span>
          )}
        </div>
      </div>
      <StatusRibbon />
    </div>
  );
}
