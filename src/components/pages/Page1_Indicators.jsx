import { useState, useEffect, useRef, useCallback } from "react";
import { useApp } from "../../context/AppContext";

// MT5-style smooth sine-wave oscillator canvas
function MT5Oscillator({ values = [], label, color, refLineColor = "rgba(255,255,255,0.12)" }) {
  const canvasRef = useRef(null);
  const wrapRef   = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    const DPR = window.devicePixelRatio || 1;
    const W   = wrap.clientWidth  || 340;
    const H   = wrap.clientHeight || 80;
    canvas.width  = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.scale(DPR, DPR);

    // Background
    ctx.fillStyle = "#0A0D12";
    ctx.fillRect(0, 0, W, H);

    const MID = H / 2;

    // Grid: horizontal reference lines at 0, +half, -half
    [0, 0.35, -0.35].forEach(frac => {
      const y = MID - frac * (H * 0.4);
      ctx.strokeStyle = frac === 0
        ? "rgba(255,255,255,0.15)"
        : refLineColor;
      ctx.lineWidth = frac === 0 ? 1 : 0.5;
      ctx.setLineDash(frac === 0 ? [] : [4, 6]);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    });
    ctx.setLineDash([]);

    if (!values.length) return;

    const slice   = values.slice(-Math.floor(W / 3));
    const max     = Math.max(...slice.map(Math.abs), 0.0001);
    const stepX   = W / Math.max(slice.length - 1, 1);

    // Gradient fill under curve
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    const last  = slice[slice.length - 1] || 0;
    const positive = last >= 0;
    if (positive) {
      grad.addColorStop(0, color.replace(")", ",0.25)").replace("rgb", "rgba"));
      grad.addColorStop(0.5, color.replace(")", ",0.06)").replace("rgb", "rgba"));
      grad.addColorStop(1, "transparent");
    } else {
      grad.addColorStop(0, "transparent");
      grad.addColorStop(0.5, color.replace(")", ",0.06)").replace("rgb", "rgba"));
      grad.addColorStop(1, color.replace(")", ",0.25)").replace("rgb", "rgba"));
    }

    // Build smooth path using quadratic curves
    const pts = slice.map((v, i) => ({
      x: i * stepX,
      y: MID - (v / max) * (H * 0.42),
    }));

    ctx.beginPath();
    ctx.moveTo(pts[0].x, MID);
    ctx.lineTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpx  = (prev.x + curr.x) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, cpx, (prev.y + curr.y) / 2);
    }
    if (pts.length > 1) {
      const last = pts[pts.length - 1];
      ctx.lineTo(last.x, last.y);
    }
    ctx.lineTo(pts[pts.length - 1].x, MID);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Smooth wave line
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const curr = pts[i];
      const cpx  = (prev.x + curr.x) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, cpx, (prev.y + curr.y) / 2);
    }
    if (pts.length > 1) {
      const p = pts[pts.length - 1];
      ctx.lineTo(p.x, p.y);
    }
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1.8;
    ctx.stroke();

    // Zero-crossing vertical tick
    if (pts.length > 1) {
      const last = pts[pts.length - 1];
      ctx.beginPath();
      ctx.arc(last.x, last.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }, [values, color, refLineColor]);

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

export default function Page1_Indicators() {
  const { state } = useApp();
  const [aoHist, setAoHist] = useState(Array(150).fill(0));
  const [acHist, setAcHist] = useState(Array(150).fill(0));

  useEffect(() => {
    setAoHist(p => [...p.slice(1), state.signals.ao || 0]);
    setAcHist(p => [...p.slice(1), state.signals.ac || 0]);
  }, [state.signals.ao, state.signals.ac]);

  const ao   = state.signals.ao || 0;
  const ac   = state.signals.ac || 0;
  const dir  = state.signals.direction;
  const aoBull = ao > 0;
  const acBull = ac > 0;

  const panelBg    = "#0D1117";
  const borderCol  = "rgba(0,229,255,0.08)";

  const signalColor = dir === "BUY" ? "#00FF88" : dir === "SELL" ? "#FF3B5C" : "#607080";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#0A0D12" }}>

      {/* Header */}
      <div style={{ padding: "10px 14px 6px", flexShrink: 0, borderBottom: `1px solid ${borderCol}` }}>
        <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "13px", color: "#00E5FF", letterSpacing: ".15em" }}>
          INDICATORS
        </div>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#607080", marginTop: "2px", letterSpacing: ".1em" }}>
          NOCTIS · AO / AC OSCILLATOR ENGINE
        </div>
      </div>

      {/* Master Signal Card */}
      <div style={{
        margin: "10px 12px 8px",
        background: dir === "BUY" ? "rgba(0,255,136,0.06)" : dir === "SELL" ? "rgba(255,59,92,0.06)" : "rgba(17,24,32,0.8)",
        border: `1px solid ${signalColor}44`,
        borderRadius: "6px",
        padding: "14px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#607080", letterSpacing: ".12em", marginBottom: "4px" }}>
            FUSED SIGNAL
          </div>
          <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "22px", fontWeight: 900, color: signalColor, letterSpacing: ".2em" }}>
            {dir || "SCANNING"}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "flex-end" }}>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "10px", color: acBull ? "#00FF88" : "#FF3B5C" }}>
            AC {ac >= 0 ? "+" : ""}{ac.toFixed(4)}
          </div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "10px", color: aoBull ? "#00FF88" : "#FF3B5C" }}>
            AO {ao >= 0 ? "+" : ""}{ao.toFixed(4)}
          </div>
        </div>
      </div>

      {/* AC Panel — MT5 style */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", margin: "0 0 1px 0", minHeight: 0, background: panelBg, borderTop: `1px solid ${borderCol}` }}>
        {/* Panel header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 12px 2px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "10px", height: "2px", background: acBull ? "#00FF88" : "#2979FF", borderRadius: "1px" }} />
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "10px", color: "#8A9AAA", letterSpacing: ".1em" }}>AC</span>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#607080" }}>
              {acBull ? "BULL" : "BEAR"}
            </span>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "11px", fontWeight: 700, color: acBull ? "#00FF88" : "#FF3B5C" }}>
              {ac >= 0 ? "+" : ""}{ac.toFixed(5)}
            </span>
          </div>
        </div>
        {/* Wave */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <MT5Oscillator values={acHist} label="AC" color={acBull ? "#00FF88" : "#2979FF"} />
        </div>
        {/* Zero line labels */}
        <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 12px 4px", flexShrink: 0 }}>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#2A3540" }}>▸ ACCELERATION</span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: acBull ? "rgba(0,255,136,0.5)" : "rgba(41,121,255,0.5)" }}>
            {acBull ? "↑ ABOVE ZERO" : "↓ BELOW ZERO"}
          </span>
        </div>
      </div>

      {/* AO Panel — MT5 style */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: panelBg, borderTop: `1px solid ${borderCol}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 12px 2px", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ width: "10px", height: "2px", background: aoBull ? "#D4AF37" : "#FF3B5C", borderRadius: "1px" }} />
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "10px", color: "#8A9AAA", letterSpacing: ".1em" }}>AO</span>
          </div>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#607080" }}>
              {aoBull ? "BULL" : "BEAR"}
            </span>
            <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "11px", fontWeight: 700, color: aoBull ? "#D4AF37" : "#FF3B5C" }}>
              {ao >= 0 ? "+" : ""}{ao.toFixed(5)}
            </span>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <MT5Oscillator values={aoHist} label="AO" color={aoBull ? "#D4AF37" : "#FF3B5C"} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "2px 12px 4px", flexShrink: 0 }}>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#2A3540" }}>▸ AWESOME OSC</span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: aoBull ? "rgba(212,175,55,0.5)" : "rgba(255,59,92,0.5)" }}>
            {aoBull ? "↑ ABOVE ZERO" : "↓ BELOW ZERO"}
          </span>
        </div>
      </div>

      {/* Dividers + alignment guide */}
      <div style={{ flexShrink: 0, padding: "8px 14px", borderTop: `1px solid ${borderCol}`, background: "#0D1117", display: "flex", gap: "16px" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#607080", letterSpacing: ".1em" }}>AC ALIGNMENT</div>
          <div style={{ height: "3px", borderRadius: "2px", background: acBull ? "#00FF88" : "#2979FF", width: "100%", opacity: 0.7 }} />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#607080", letterSpacing: ".1em" }}>AO ALIGNMENT</div>
          <div style={{ height: "3px", borderRadius: "2px", background: aoBull ? "#D4AF37" : "#FF3B5C", width: "100%", opacity: 0.7 }} />
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px" }}>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#607080", letterSpacing: ".1em" }}>AGREEMENT</div>
          <div style={{
            height: "3px", borderRadius: "2px",
            background: (aoBull && acBull) ? "#00FF88" : (!aoBull && !acBull) ? "#FF3B5C" : "#FFD600",
            width: "100%", opacity: 0.7,
          }} />
        </div>
      </div>
    </div>
  );
}
