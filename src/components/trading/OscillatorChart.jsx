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
    const H   = wrap.clientHeight || 90;
    canvas.width  = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W+"px"; canvas.style.height = H+"px";
    ctx.scale(DPR, DPR);

    ctx.fillStyle = "#0A0D12";
    ctx.fillRect(0, 0, W, H);

    const mid  = H / 2;
    const max  = Math.max(...values.map(Math.abs), 0.0001);
    const barW = Math.max(1.5, (W / values.length) - 0.5);
    const gap  = Math.max(0.3, (W / values.length) * 0.15);

    // Zero line
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();
    ctx.setLineDash([]);

    // Horizontal reference lines
    [-0.5, 0.5].forEach(f => {
      const y = mid - (f * (mid - 3));
      ctx.strokeStyle = "rgba(201,168,76,0.08)";
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 6]);
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      ctx.setLineDash([]);
    });

    values.forEach((v, i) => {
      const prev  = i > 0 ? values[i - 1] : v;
      const x     = i * (barW + gap);
      const bh    = Math.max(1, (Math.abs(v) / max) * (mid - 3));
      const isPos = v >= 0;
      const rising = v >= prev;

      // MT5 native style: gold rising / dark steel falling
      const color = rising ? "#C9A84C" : "#1E3050";

      ctx.fillStyle = color;
      ctx.fillRect(x, isPos ? mid - bh : mid, barW, bh);
    });

    // AC: smooth wave line overlay
    if (type === "ac") {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(201,168,76,0.55)";
      ctx.lineWidth = 1.2;
      ctx.shadowColor = "#C9A84C";
      ctx.shadowBlur = 3;
      values.forEach((v, i) => {
        const x = i * (barW + gap) + barW / 2;
        const y = mid - (v / max) * (mid - 3);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
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
    <div ref={wrapRef} style={{ width:"100%", height:"90px", overflow:"hidden" }}>
      <canvas ref={canvasRef} style={{ display:"block" }} />
    </div>
  );
}
