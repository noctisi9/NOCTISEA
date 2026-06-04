import { useEffect, useRef } from "react";

export default function OscillatorChart({ values = [], type = "ao" }) {
  const canvasRef = useRef(null);
  const wrapRef   = useRef(null);

  const draw = () => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap || values.length < 2) return;
    const ctx = canvas.getContext("2d");
    const DPR = window.devicePixelRatio || 1;
    const W   = wrap.clientWidth  || window.innerWidth;
    const H   = wrap.clientHeight || 100;
    canvas.width  = W * DPR; canvas.height = H * DPR;
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
    ctx.scale(DPR, DPR);

    ctx.fillStyle = "#0A0D12";
    ctx.fillRect(0, 0, W, H);

    const mid  = H / 2;
    const max  = Math.max(...values.map(Math.abs), 0.0001);

    // Axis labels right side
    const AXIS_W = 48;
    const chartW = W - AXIS_W;

    // Zero line
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(chartW, mid); ctx.stroke();
    ctx.setLineDash([]);

    // Horizontal reference lines (MT5 style)
    [0.33, 0.66].forEach(f => {
      [mid - f*(mid-3), mid + f*(mid-3)].forEach(y => {
        ctx.strokeStyle = "rgba(201,168,76,0.07)";
        ctx.lineWidth = 1; ctx.setLineDash([2, 6]);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
        ctx.setLineDash([]);
      });
    });

    // MT5 paired bars: gold (rising) + dark steel (falling) side by side
    const n    = values.length;
    const pairW = chartW / n;
    const barW  = Math.max(1, pairW * 0.48);

    values.forEach((v, i) => {
      const prev   = i > 0 ? values[i-1] : v;
      const rising = v >= prev;
      const bh     = Math.max(1, (Math.abs(v) / max) * (mid - 4));
      const isPos  = v >= 0;
      const x      = i * pairW;

      // Gold bar (rising momentum)
      ctx.fillStyle = rising ? "#C9A84C" : "rgba(201,168,76,0.18)";
      ctx.fillRect(x, isPos ? mid - bh : mid, barW, bh);

      // Dark steel bar (comparison / previous value)
      const prevBh = Math.max(1, (Math.abs(prev) / max) * (mid - 4));
      const isPrevPos = prev >= 0;
      ctx.fillStyle = rising ? "rgba(20,30,50,0.7)" : "#1E3050";
      ctx.fillRect(x + barW + 0.5, isPrevPos ? mid - prevBh : mid, barW, prevBh);
    });

    // AC: smooth wave line overlay
    if (type === "ac") {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(201,168,76,0.45)";
      ctx.lineWidth   = 1.2;
      ctx.shadowColor = "#C9A84C";
      ctx.shadowBlur  = 3;
      values.forEach((v, i) => {
        const x = i * pairW + pairW / 2;
        const y = mid - (v / max) * (mid - 4);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Price axis (right side)
    ctx.fillStyle = "rgba(201,168,76,0.25)";
    ctx.font = "9px 'Share Tech Mono',monospace";
    ctx.textAlign = "right";
    [[max, 4], [0, mid], [-max, H-4]].forEach(([val, y]) => {
      ctx.fillText(val.toFixed(4), W - 3, y + 3);
    });

    // Time axis (bottom — last 5 timestamps)
    ctx.fillStyle = "rgba(201,168,76,0.18)";
    ctx.font = "8px 'Share Tech Mono',monospace";
    ctx.textAlign = "center";
    const now = new Date();
    for (let i = 0; i < 5; i++) {
      const t   = new Date(now - (4-i) * 60000);
      const str = t.toTimeString().slice(0, 5);
      const x   = chartW * ((i+1) / 6);
      ctx.fillText(str, x, H - 1);
    }
  };

  useEffect(() => {
    draw();
    const t = setTimeout(draw, 80);
    return () => clearTimeout(t);
  }, [values, type]);

  useEffect(() => {
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [values]);

  return (
    <div ref={wrapRef} style={{ width:"100%", height:"100%", overflow:"hidden", position:"relative" }}>
      <canvas ref={canvasRef} style={{ display:"block", position:"absolute", top:0, left:0 }} />
    </div>
  );
}
