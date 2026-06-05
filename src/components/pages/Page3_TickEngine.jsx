import { useRef, useEffect, useCallback, useState } from "react";
import { useApp } from "../../context/AppContext";

// Build synthetic 1-second OHLC candles from raw tick stream
function buildSyntheticCandles(tickBuffer, maxCandles = 60) {
  const bySecond = {};
  tickBuffer.forEach(t => {
    const key = Math.floor(t.time / 1000) * 1000;
    if (!bySecond[key]) bySecond[key] = { open: t.price, high: t.price, low: t.price, close: t.price, count: 0 };
    const b = bySecond[key];
    b.high  = Math.max(b.high, t.price);
    b.low   = Math.min(b.low,  t.price);
    b.close = t.price;
    b.count++;
  });
  return Object.entries(bySecond)
    .sort(([a], [b]) => +a - +b)
    .slice(-maxCandles)
    .map(([time, c]) => ({ ...c, time: +time }));
}

// Tick candles canvas — 1-second synthetic candles
function TickCandleChart({ candles = [] }) {
  const canvasRef = useRef(null);
  const wrapRef   = useRef(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    const DPR = window.devicePixelRatio || 1;
    const W   = wrap.clientWidth  || 340;
    const H   = wrap.clientHeight || 160;
    canvas.width  = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.scale(DPR, DPR);

    ctx.fillStyle = "#08090F";
    ctx.fillRect(0, 0, W, H);

    if (!candles.length) {
      ctx.fillStyle = "rgba(0,229,255,0.2)";
      ctx.font = "10px 'Share Tech Mono',monospace";
      ctx.textAlign = "center";
      ctx.fillText("BUILDING 1-SEC CANDLES...", W / 2, H / 2);
      return;
    }

    const PAD_T = 10; const PAD_B = 18; const AXIS_W = 50;
    const chartW = W - AXIS_W;
    const chartH = H - PAD_T - PAD_B;

    const highs = candles.map(c => c.high);
    const lows  = candles.map(c => c.low);
    let maxP = Math.max(...highs);
    let minP = Math.min(...lows);
    const rng = (maxP - minP) || 1;
    maxP += rng * 0.08; minP -= rng * 0.08;
    const range = (maxP - minP) || 1;
    const toY = p => PAD_T + chartH - ((p - minP) / range) * chartH;

    // Subtle grid
    ctx.strokeStyle = "rgba(0,229,255,0.04)"; ctx.lineWidth = 0.5;
    for (let i = 0; i <= 3; i++) {
      const y = PAD_T + (chartH / 3) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
    }

    const barGap = chartW / Math.max(candles.length, 1);
    const barW   = Math.max(2, barGap * 0.7);

    candles.forEach((c, i) => {
      const x     = i * barGap + barGap / 2;
      const bull  = c.close >= c.open;
      const color = bull ? "#D4AF37" : "#2979FF";

      // Wick
      ctx.strokeStyle = color; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, toY(c.high));
      ctx.lineTo(x, toY(c.low));
      ctx.stroke();

      // Body
      const bTop = toY(Math.max(c.open, c.close));
      const bH   = Math.max(1.5, toY(Math.min(c.open, c.close)) - bTop);
      ctx.fillStyle = color;
      ctx.fillRect(x - barW / 2, bTop, barW, bH);

      // Tick count dot (larger = more ticks)
      if (c.count > 3) {
        const r = Math.min(3, c.count / 5);
        ctx.beginPath();
        ctx.arc(x, PAD_T + chartH + 8, r, 0, Math.PI * 2);
        ctx.fillStyle = bull ? "rgba(212,175,55,0.6)" : "rgba(41,121,255,0.6)";
        ctx.fill();
      }
    });

    // Price axis
    ctx.fillStyle = "#607080"; ctx.font = "8px 'Share Tech Mono',monospace"; ctx.textAlign = "left";
    for (let i = 0; i <= 3; i++) {
      const price = minP + (range / 3) * (3 - i);
      const y     = PAD_T + (chartH / 3) * i;
      ctx.fillText(price.toFixed(2), chartW + 2, y + 3);
    }

    // "1SEC" label
    ctx.fillStyle = "rgba(0,229,255,0.3)"; ctx.textAlign = "left";
    ctx.fillText("1-SEC SYNTHETIC", 4, 9);
  }, [candles]);

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

export default function Page3_TickEngine() {
  const { state } = useApp();
  const ts   = state.tickStats;
  const wf   = state.welford;
  const dir  = state.signals.direction;
  const isSpike = state.signals.spikeWarning;

  // Tick buffer for synthetic candle building
  const tickBuf = useRef([]);
  const [synthCandles, setSynthCandles] = useState([]);

  // Build synthetic candles from price updates
  useEffect(() => {
    if (!state.currentPrice) return;
    tickBuf.current.push({ price: state.currentPrice, time: Date.now() });
    // Keep last 5 minutes of ticks
    const cutoff = Date.now() - 5 * 60 * 1000;
    tickBuf.current = tickBuf.current.filter(t => t.time > cutoff);
    setSynthCandles(buildSyntheticCandles(tickBuf.current, 60));
  }, [state.currentPrice]);

  const hz   = ts.hz || 0;
  const comprPct = wf.stdDev && wf.sigmaMean
    ? Math.max(0, Math.round((1 - (wf.stdDev / (wf.sigmaMean || 1))) * 100))
    : 0;
  const velocity = ts.avgVelocity || 0;
  const bullPct  = ts.bullPct || 50;
  const bearPct  = ts.bearPct || 50;
  const bullW    = (ts.bullTicks || 0) + (ts.bearTicks || 0) > 0
    ? (ts.bullTicks / ((ts.bullTicks || 0) + (ts.bearTicks || 0))) * 100
    : 50;

  // Heat level: 0 (cold) → 1 (hot)
  const heatScore = Math.min(1, (
    (hz > 18 ? 0.4 : hz > 12 ? 0.2 : 0) +
    (comprPct > 60 ? 0.35 : comprPct > 30 ? 0.15 : 0) +
    (velocity > 0.1 ? 0.25 : velocity > 0.05 ? 0.1 : 0)
  ));

  const heatLabel  = heatScore > 0.65 ? "HOT" : heatScore > 0.35 ? "WARM" : "COLD";
  const heatColor  = heatScore > 0.65 ? "#FFD600" : heatScore > 0.35 ? "#FF8C00" : "#2979FF";
  const glowRadius = Math.round(6 + heatScore * 28);
  const glowAlpha  = 0.15 + heatScore * 0.5;
  const glowColor  = `rgba(${heatScore > 0.65 ? "255,214,0" : heatScore > 0.35 ? "255,140,0" : "41,121,255"},${glowAlpha})`;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#0A0D12" }}>

      {/* Header */}
      <div style={{ padding: "8px 14px 4px", flexShrink: 0, borderBottom: "1px solid rgba(0,229,255,0.08)" }}>
        <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "13px", color: "#00E5FF", letterSpacing: ".15em" }}>TICK ENGINE</div>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#607080", marginTop: "2px" }}>
          1-SEC SYNTHETIC CANDLES · WELFORD STATISTICAL ENGINE
        </div>
      </div>

      {/* Tick candle chart — main visual */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <TickCandleChart candles={synthCandles} />

        {/* ── HEAT INDICATOR BOX (top-left, small, blur effect) ── */}
        <div style={{
          position: "absolute",
          top: 6, left: 6,
          padding: "6px 10px",
          borderRadius: "6px",
          background: `rgba(10,13,18,0.82)`,
          border: `1px solid ${heatColor}55`,
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          boxShadow: `0 0 ${glowRadius}px ${glowColor}, inset 0 0 8px rgba(0,0,0,0.3)`,
          zIndex: 10,
          minWidth: "80px",
        }}>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#607080", letterSpacing: ".1em", marginBottom: "2px" }}>
            MARKET STATE
          </div>
          <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "14px", fontWeight: 900, color: heatColor, lineHeight: 1.1, textShadow: `0 0 10px ${heatColor}` }}>
            {heatLabel}
          </div>
          <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#8A9AAA" }}>
              {hz}Hz
            </div>
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#8A9AAA" }}>
              C:{comprPct}%
            </div>
          </div>
        </div>

        {/* Signal dot on latest candle area */}
        {(dir === "BUY" || dir === "SELL") && (
          <div style={{
            position: "absolute",
            top: 6, right: 6,
            padding: "4px 8px",
            borderRadius: "4px",
            background: dir === "BUY" ? "rgba(0,255,136,0.15)" : "rgba(255,59,92,0.15)",
            border: `1px solid ${dir === "BUY" ? "#00FF88" : "#FF3B5C"}55`,
            backdropFilter: "blur(6px)",
            fontFamily: "'Orbitron',monospace",
            fontSize: "10px",
            fontWeight: 700,
            color: dir === "BUY" ? "#00FF88" : "#FF3B5C",
            letterSpacing: ".1em",
          }}>
            {dir === "BUY" ? "▲ BUY" : "▼ SELL"}
          </div>
        )}
        {isSpike && (
          <div style={{
            position: "absolute",
            top: 6, right: 6,
            padding: "4px 8px",
            borderRadius: "4px",
            background: "rgba(255,214,0,0.15)",
            border: "1px solid rgba(255,214,0,0.5)",
            backdropFilter: "blur(6px)",
            fontFamily: "'Orbitron',monospace",
            fontSize: "10px",
            fontWeight: 700,
            color: "#FFD600",
            animation: "pulse 0.8s ease-in-out infinite",
          }}>
            ⚡ SPIKE
          </div>
        )}
      </div>

      {/* Stats grid */}
      <div style={{ flexShrink: 0, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1px", borderTop: "1px solid rgba(0,229,255,0.08)", background: "rgba(0,229,255,0.04)" }}>
        {[
          { label: "TICKS/SEC", value: hz, color: hz < 8 ? "#FF3B5C" : hz <= 18 ? "#00FF88" : "#FFD600" },
          { label: "COMPRESS", value: `${comprPct}%`, color: comprPct > 50 ? "#FFD600" : "#00FF88" },
          { label: "VELOCITY", value: velocity.toFixed(4), color: "#00E5FF" },
        ].map(s => (
          <div key={s.label} style={{ background: "#0D1117", padding: "8px 10px" }}>
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#607080", letterSpacing: ".08em", marginBottom: "2px" }}>{s.label}</div>
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "12px", fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Bull/Bear bar */}
      <div style={{ flexShrink: 0, padding: "6px 12px", background: "#0D1117", borderTop: "1px solid rgba(0,229,255,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#D4AF37" }}>▲ BUY {bullPct}%</span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#2979FF" }}>{bearPct}% SELL ▼</span>
        </div>
        <div style={{ display: "flex", height: "6px", borderRadius: "3px", overflow: "hidden", background: "#0A0D12" }}>
          <div style={{ width: `${bullW}%`, background: "linear-gradient(90deg, #D4AF37, #D4AF37cc)", transition: "width 0.3s" }} />
          <div style={{ flex: 1, background: "linear-gradient(90deg, #2979FFcc, #2979FF)" }} />
        </div>
      </div>

      {/* Hz status */}
      <div style={{ flexShrink: 0, padding: "6px 12px 8px", background: "#0A0D12", borderTop: "1px solid rgba(0,229,255,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: heatColor, boxShadow: `0 0 8px ${heatColor}`, animation: "pulse 1.5s ease-in-out infinite" }} />
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#8A9AAA" }}>
            {hz < 8 ? "LOW — COMPRESSION RISK" : hz <= 18 ? "NORMAL 12–18 Hz" : "HIGH ACTIVITY"}
          </span>
          <span style={{ marginLeft: "auto", fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#607080" }}>
            {synthCandles.length} candles built
          </span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%,100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
