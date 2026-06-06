import { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../../context/AppContext";

const HISTORY_SIZE = 200;

// MT5-style HISTOGRAM bars (not lines), left=oldest, right=newest
function MT5Histogram({ values = [], color, bullColor, bearColor }) {
  const canvasRef = useRef(null);
  const wrapRef   = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    const DPR = window.devicePixelRatio || 1;
    const W = wrap.clientWidth || 340, H = wrap.clientHeight || 90;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.scale(DPR, DPR);

    ctx.fillStyle = "#0A0D12";
    ctx.fillRect(0, 0, W, H);

    const MID = H / 2;

    // Zero line
    ctx.strokeStyle = "rgba(255,255,255,0.2)"; ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(0, MID); ctx.lineTo(W, MID); ctx.stroke();

    // Reference lines ±35%
    [0.38, -0.38].forEach(frac => {
      const y = MID - frac * (H * 0.42);
      ctx.strokeStyle = "rgba(255,255,255,0.06)"; ctx.lineWidth = 0.5; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    });
    ctx.setLineDash([]);

    if (values.length < 2) {
      ctx.fillStyle = "rgba(0,229,255,0.2)"; ctx.font = "9px 'Share Tech Mono',monospace";
      ctx.textAlign = "center"; ctx.fillText("BUILDING...", W / 2, MID + 4);
      return;
    }

    // Oldest on LEFT, newest on RIGHT
    const maxBars = Math.floor(W / 3);
    const slice   = values.slice(-maxBars);
    const max     = Math.max(...slice.map(Math.abs), 0.0001);
    const barW    = Math.max(1, Math.floor(W / slice.length) - 1);

    slice.forEach((v, i) => {
      const x    = i * (W / slice.length);
      const barH = Math.abs(v / max) * (H * 0.44);
      const bull = v >= 0;
      const c    = bull ? (bullColor || "#00FF88") : (bearColor || "#2979FF");

      // Bar from zero line
      ctx.fillStyle = c;
      if (bull) ctx.fillRect(x, MID - barH, barW, barH);
      else      ctx.fillRect(x, MID, barW, barH);

      // Bright top edge
      ctx.fillStyle = bull
        ? c.replace(")", ",0.9)").replace("rgb", "rgba")
        : c.replace(")", ",0.9)").replace("rgb", "rgba");
    });

    // Highlight most recent bar with brighter outline
    const lastV = slice[slice.length - 1];
    const lastX = (slice.length - 1) * (W / slice.length);
    const lastH = Math.abs(lastV / max) * (H * 0.44);
    const lBull = lastV >= 0;
    ctx.strokeStyle = lBull ? (bullColor || "#00FF88") : (bearColor || "#2979FF");
    ctx.lineWidth = 1;
    if (lBull) ctx.strokeRect(lastX, MID - lastH, barW, lastH);
    else       ctx.strokeRect(lastX, MID, barW, lastH);

    // Zero cross markers
    for (let i = 1; i < slice.length; i++) {
      if ((slice[i-1] >= 0) !== (slice[i] >= 0)) {
        const x = i * (W / slice.length);
        ctx.strokeStyle = "rgba(255,255,255,0.5)"; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, MID - 5); ctx.lineTo(x, MID + 5); ctx.stroke();
      }
    }
  }, [values, bullColor, bearColor]);

  useEffect(() => {
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw]);

  return <div ref={wrapRef} style={{ width: "100%", height: "100%" }}><canvas ref={canvasRef} style={{ display: "block" }} /></div>;
}

export { MT5Histogram };

export function PageArrows({ onNext, onPrev, pageIndex, totalPages }) {
  return (
    <>
      {onPrev && pageIndex > 0 && (
        <button onClick={onPrev} style={{
          position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", zIndex: 20,
          background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.3)",
          borderLeft: "none", borderRadius: "0 6px 6px 0",
          color: "#00E5FF", fontSize: "20px", padding: "14px 8px", cursor: "pointer",
          backdropFilter: "blur(4px)", lineHeight: 1,
        }}>‹</button>
      )}
      {onNext && pageIndex < totalPages - 1 && (
        <button onClick={onNext} style={{
          position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", zIndex: 20,
          background: "rgba(0,229,255,0.08)", border: "1px solid rgba(0,229,255,0.3)",
          borderRight: "none", borderRadius: "6px 0 0 6px",
          color: "#00E5FF", fontSize: "20px", padding: "14px 8px", cursor: "pointer",
          backdropFilter: "blur(4px)", lineHeight: 1,
        }}>›</button>
      )}
    </>
  );
}

export default function Page1_Indicators({ onNext, onPrev }) {
  const { state } = useApp();
  const [aoHist, setAoHist] = useState(Array(HISTORY_SIZE).fill(0));
  const [acHist, setAcHist] = useState(Array(HISTORY_SIZE).fill(0));

  useEffect(() => {
    setAoHist(p => [...p.slice(1), state.signals.ao || 0]);
    setAcHist(p => [...p.slice(1), state.signals.ac || 0]);
  }, [state.signals.ao, state.signals.ac]);

  const ao = state.signals.ao || 0, ac = state.signals.ac || 0;
  const dir = state.signals.direction;
  const aoBull = ao > 0, acBull = ac > 0;
  const signalColor = dir === "BUY" ? "#00FF88" : dir === "SELL" ? "#FF3B5C" : "#607080";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#0A0D12", position: "relative" }}>
      <PageArrows onNext={onNext} onPrev={onPrev} pageIndex={1} totalPages={6} />

      {/* Header */}
      <div style={{ padding: "10px 14px 6px", flexShrink: 0, borderBottom: "1px solid rgba(0,229,255,0.08)" }}>
        <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "13px", color: "#00E5FF", letterSpacing: ".15em" }}>INDICATORS</div>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#607080", marginTop: "2px" }}>
          NOCTIS · AO / AC HISTOGRAM · {HISTORY_SIZE} BAR HISTORY · OLDEST LEFT → NEWEST RIGHT
        </div>
      </div>

      {/* Signal card */}
      <div style={{
        margin: "8px 12px 6px", flexShrink: 0,
        background: dir === "BUY" ? "rgba(0,255,136,0.06)" : dir === "SELL" ? "rgba(255,59,92,0.06)" : "rgba(17,24,32,0.8)",
        border: `1px solid ${signalColor}44`, borderRadius: "6px",
        padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#607080", letterSpacing: ".12em", marginBottom: "3px" }}>FUSED SIGNAL</div>
          <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "22px", fontWeight: 900, color: signalColor, letterSpacing: ".2em" }}>{dir || "SCANNING"}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "flex-end" }}>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "10px", color: acBull ? "#00FF88" : "#FF3B5C" }}>AC {ac >= 0 ? "+" : ""}{ac.toFixed(4)}</div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "10px", color: aoBull ? "#D4AF37" : "#FF3B5C" }}>AO {ao >= 0 ? "+" : ""}{ao.toFixed(4)}</div>
        </div>
      </div>

      {/* AC Histogram */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: "#0D1117", borderTop: "1px solid rgba(0,229,255,0.07)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 12px 2px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "10px", height: "10px", background: acBull ? "#00FF88" : "#2979FF", borderRadius: "1px" }} />
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "10px", color: "#8A9AAA" }}>AC</span>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#2A3540" }}>ACCELERATION CONVERGENCE</span>
          </div>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "11px", fontWeight: 700, color: acBull ? "#00FF88" : "#2979FF" }}>
            {ac >= 0 ? "+" : ""}{ac.toFixed(5)}
          </span>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <MT5Histogram values={acHist} bullColor="#00FF88" bearColor="#2979FF" />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 12px 3px", flexShrink: 0 }}>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "7px", color: "#2A3540" }}>← OLDEST</span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "7px", color: acBull ? "rgba(0,255,136,0.5)" : "rgba(41,121,255,0.5)" }}>{acBull ? "↑ ABOVE ZERO" : "↓ BELOW ZERO"}</span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "7px", color: "#2A3540" }}>NEWEST →</span>
        </div>
      </div>

      {/* AO Histogram */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: "#0D1117", borderTop: "1px solid rgba(0,229,255,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 12px 2px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "10px", height: "10px", background: aoBull ? "#D4AF37" : "#FF3B5C", borderRadius: "1px" }} />
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "10px", color: "#8A9AAA" }}>AO</span>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#2A3540" }}>AWESOME OSCILLATOR</span>
          </div>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "11px", fontWeight: 700, color: aoBull ? "#D4AF37" : "#FF3B5C" }}>
            {ao >= 0 ? "+" : ""}{ao.toFixed(5)}
          </span>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <MT5Histogram values={aoHist} bullColor="#D4AF37" bearColor="#FF3B5C" />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 12px 3px", flexShrink: 0 }}>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "7px", color: "#2A3540" }}>← OLDEST</span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "7px", color: aoBull ? "rgba(212,175,55,0.5)" : "rgba(255,59,92,0.5)" }}>{aoBull ? "↑ ABOVE ZERO" : "↓ BELOW ZERO"}</span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "7px", color: "#2A3540" }}>NEWEST →</span>
        </div>
      </div>

      {/* Agreement bar */}
      <div style={{ flexShrink: 0, padding: "6px 12px 8px", borderTop: "1px solid rgba(0,229,255,0.06)", background: "#0A0D12", display: "flex", gap: "10px" }}>
        {[
          { label: "AC", color: acBull ? "#00FF88" : "#2979FF" },
          { label: "AO", color: aoBull ? "#D4AF37" : "#FF3B5C" },
          { label: "AGREE", color: aoBull === acBull ? (aoBull ? "#00FF88" : "#FF3B5C") : "#FFD600" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#607080", marginBottom: "3px" }}>{s.label}</div>
            <div style={{ height: "3px", borderRadius: "2px", background: s.color, opacity: 0.75 }} />
          </div>
        ))}
      </div>
    </div>
  );
}
