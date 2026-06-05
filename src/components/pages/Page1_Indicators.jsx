import { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../../context/AppContext";

const HISTORY_SIZE = 200; // keep 200 data points — scrolls left→right like a chart

function MT5Oscillator({ values = [], label, color }) {
  const canvasRef = useRef(null);
  const wrapRef   = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    const DPR = window.devicePixelRatio || 1;
    const W   = wrap.clientWidth  || 340;
    const H   = wrap.clientHeight || 90;
    canvas.width  = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.scale(DPR, DPR);

    ctx.fillStyle = "#0A0D12";
    ctx.fillRect(0, 0, W, H);

    const MID = H / 2;

    // Zero line
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.lineWidth = 1; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(0, MID); ctx.lineTo(W, MID); ctx.stroke();

    // Upper / lower reference lines at 35%
    [0.38, -0.38].forEach(frac => {
      const y = MID - frac * (H * 0.42);
      ctx.strokeStyle = "rgba(255,255,255,0.07)";
      ctx.lineWidth = 0.5; ctx.setLineDash([4, 6]);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    });
    ctx.setLineDash([]);

    if (values.length < 2) {
      ctx.fillStyle = "rgba(0,229,255,0.2)";
      ctx.font = "9px 'Share Tech Mono',monospace";
      ctx.textAlign = "center";
      ctx.fillText("BUILDING HISTORY...", W / 2, MID + 4);
      return;
    }

    // Always show ALL history, newest on the RIGHT
    // Each data point gets a fixed pixel slot — older on left, newer on right
    const SLOT  = Math.max(2, W / Math.min(values.length, HISTORY_SIZE));
    const slice = values.slice(-Math.floor(W / SLOT));
    const max   = Math.max(...slice.map(Math.abs), 0.0001);

    const pts = slice.map((v, i) => ({
      x: i * SLOT + SLOT / 2,
      y: MID - (v / max) * (H * 0.43),
    }));

    // Gradient fill under the curve
    const last     = slice[slice.length - 1] || 0;
    const positive = last >= 0;
    const grad     = ctx.createLinearGradient(0, 0, 0, H);
    const rgba     = (a) => color.startsWith("#")
      ? `rgba(${parseInt(color.slice(1,3),16)},${parseInt(color.slice(3,5),16)},${parseInt(color.slice(5,7),16)},${a})`
      : color.replace("rgb(","rgba(").replace(")",`,${a})`);

    if (positive) {
      grad.addColorStop(0,   rgba(0.28));
      grad.addColorStop(0.5, rgba(0.06));
      grad.addColorStop(1,   "transparent");
    } else {
      grad.addColorStop(0,   "transparent");
      grad.addColorStop(0.5, rgba(0.06));
      grad.addColorStop(1,   rgba(0.28));
    }

    // Smooth curve path (quadratic bezier for smooth wave)
    const buildPath = () => {
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const curr = pts[i];
        const cpx  = (prev.x + curr.x) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, cpx, (prev.y + curr.y) / 2);
      }
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    };

    // Fill area
    buildPath();
    ctx.lineTo(pts[pts.length - 1].x, MID);
    ctx.lineTo(pts[0].x, MID);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Wave line
    buildPath();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.8;
    ctx.stroke();

    // Live dot at newest point (right edge)
    const tip = pts[pts.length - 1];
    ctx.beginPath();
    ctx.arc(tip.x, tip.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Zero cross markers — small tick when value crosses zero
    for (let i = 1; i < slice.length; i++) {
      if ((slice[i-1] >= 0) !== (slice[i] >= 0)) {
        const x = pts[i].x;
        ctx.strokeStyle = "rgba(255,255,255,0.4)";
        ctx.lineWidth = 1; ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(x, MID - 5); ctx.lineTo(x, MID + 5); ctx.stroke();
      }
    }
  }, [values, color]);

  useEffect(() => {
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [draw]);

  return (
    <div ref={wrapRef} style={{ width: "100%", height: "100%" }}>
      <canvas ref={canvasRef} style={{ display: "block" }} />
    </div>
  );
}

// Reusable next/prev arrow overlay for all pages
export function PageArrows({ onNext, onPrev, pageIndex, totalPages }) {
  return (
    <>
      {onPrev && pageIndex > 0 && (
        <button onClick={onPrev} style={{
          position: "absolute", left: 0, top: "50%",
          transform: "translateY(-50%)", zIndex: 20,
          background: "rgba(0,229,255,0.08)",
          border: "1px solid rgba(0,229,255,0.3)",
          borderLeft: "none", borderRadius: "0 6px 6px 0",
          color: "#00E5FF", fontSize: "20px",
          padding: "14px 8px", cursor: "pointer",
          backdropFilter: "blur(4px)", lineHeight: 1,
        }}>‹</button>
      )}
      {onNext && pageIndex < totalPages - 1 && (
        <button onClick={onNext} style={{
          position: "absolute", right: 0, top: "50%",
          transform: "translateY(-50%)", zIndex: 20,
          background: "rgba(0,229,255,0.08)",
          border: "1px solid rgba(0,229,255,0.3)",
          borderRight: "none", borderRadius: "6px 0 0 6px",
          color: "#00E5FF", fontSize: "20px",
          padding: "14px 8px", cursor: "pointer",
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

  // Append newest value to the RIGHT of history
  useEffect(() => {
    setAoHist(p => [...p.slice(1), state.signals.ao || 0]);
    setAcHist(p => [...p.slice(1), state.signals.ac || 0]);
  }, [state.signals.ao, state.signals.ac]);

  const ao   = state.signals.ao || 0;
  const ac   = state.signals.ac || 0;
  const dir  = state.signals.direction;
  const aoBull = ao > 0;
  const acBull = ac > 0;
  const signalColor = dir === "BUY" ? "#00FF88" : dir === "SELL" ? "#FF3B5C" : "#607080";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#0A0D12", position: "relative" }}>

      {/* Page nav arrows */}
      <PageArrows onNext={onNext} onPrev={onPrev} pageIndex={1} totalPages={6} />

      {/* Header */}
      <div style={{ padding: "10px 14px 6px", flexShrink: 0, borderBottom: "1px solid rgba(0,229,255,0.08)" }}>
        <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "13px", color: "#00E5FF", letterSpacing: ".15em" }}>
          INDICATORS
        </div>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#607080", marginTop: "2px", letterSpacing: ".1em" }}>
          NOCTIS · AO / AC OSCILLATOR ENGINE · HISTORY {HISTORY_SIZE} BARS
        </div>
      </div>

      {/* Fused signal card */}
      <div style={{
        margin: "8px 12px 6px", flexShrink: 0,
        background: dir === "BUY" ? "rgba(0,255,136,0.06)" : dir === "SELL" ? "rgba(255,59,92,0.06)" : "rgba(17,24,32,0.8)",
        border: `1px solid ${signalColor}44`, borderRadius: "6px",
        padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#607080", letterSpacing: ".12em", marginBottom: "3px" }}>FUSED SIGNAL</div>
          <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "22px", fontWeight: 900, color: signalColor, letterSpacing: ".2em" }}>
            {dir || "SCANNING"}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px", alignItems: "flex-end" }}>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "10px", color: acBull ? "#00FF88" : "#FF3B5C" }}>
            AC {ac >= 0 ? "+" : ""}{ac.toFixed(4)}
          </div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "10px", color: aoBull ? "#D4AF37" : "#FF3B5C" }}>
            AO {ao >= 0 ? "+" : ""}{ao.toFixed(4)}
          </div>
        </div>
      </div>

      {/* ── AC Panel ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: "#0D1117", borderTop: "1px solid rgba(0,229,255,0.07)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 12px 2px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "12px", height: "2px", background: acBull ? "#00FF88" : "#2979FF", borderRadius: "1px" }} />
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "10px", color: "#8A9AAA", letterSpacing: ".1em" }}>AC</span>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#2A3540" }}>ACCELERATION CONVERGENCE</span>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#607080" }}>{acBull ? "↑ BULL" : "↓ BEAR"}</span>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "11px", fontWeight: 700, color: acBull ? "#00FF88" : "#2979FF" }}>
              {ac >= 0 ? "+" : ""}{ac.toFixed(5)}
            </span>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <MT5Oscillator values={acHist} label="AC" color={acBull ? "#00FF88" : "#2979FF"} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 12px 3px", flexShrink: 0 }}>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "7px", color: "#2A3540" }}>OLDEST ←</span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "7px", color: acBull ? "rgba(0,255,136,0.45)" : "rgba(41,121,255,0.45)" }}>
            {acBull ? "↑ ABOVE ZERO" : "↓ BELOW ZERO"}
          </span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "7px", color: "#2A3540" }}>→ NEWEST</span>
        </div>
      </div>

      {/* ── AO Panel ── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: "#0D1117", borderTop: "1px solid rgba(0,229,255,0.06)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 12px 2px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "12px", height: "2px", background: aoBull ? "#D4AF37" : "#FF3B5C", borderRadius: "1px" }} />
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "10px", color: "#8A9AAA", letterSpacing: ".1em" }}>AO</span>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#2A3540" }}>AWESOME OSCILLATOR</span>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#607080" }}>{aoBull ? "↑ BULL" : "↓ BEAR"}</span>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "11px", fontWeight: 700, color: aoBull ? "#D4AF37" : "#FF3B5C" }}>
              {ao >= 0 ? "+" : ""}{ao.toFixed(5)}
            </span>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <MT5Oscillator values={aoHist} label="AO" color={aoBull ? "#D4AF37" : "#FF3B5C"} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "1px 12px 3px", flexShrink: 0 }}>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "7px", color: "#2A3540" }}>OLDEST ←</span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "7px", color: aoBull ? "rgba(212,175,55,0.45)" : "rgba(255,59,92,0.45)" }}>
            {aoBull ? "↑ ABOVE ZERO" : "↓ BELOW ZERO"}
          </span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "7px", color: "#2A3540" }}>→ NEWEST</span>
        </div>
      </div>

      {/* Agreement bar */}
      <div style={{ flexShrink: 0, padding: "6px 12px 8px", borderTop: "1px solid rgba(0,229,255,0.06)", background: "#0A0D12", display: "flex", gap: "10px" }}>
        {[
          { label: "AC", bull: acBull, color: acBull ? "#00FF88" : "#2979FF" },
          { label: "AO", bull: aoBull, color: aoBull ? "#D4AF37" : "#FF3B5C" },
          { label: "AGREE", bull: aoBull === acBull, color: aoBull === acBull ? (aoBull ? "#00FF88" : "#FF3B5C") : "#FFD600" },
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
