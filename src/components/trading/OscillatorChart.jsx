import { useEffect, useRef } from "react";

export default function OscillatorChart({ values = [], type = "ao" }) {
  const canvasRef = useRef(null);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || !values.length) return;
    const ctx = canvas.getContext("2d");
    const DPR = window.devicePixelRatio || 1;
    const W   = canvas.offsetWidth;
    const H   = canvas.offsetHeight;
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR);

    // Background
    ctx.fillStyle = "#0A0D12";
    ctx.fillRect(0, 0, W, H);

    const mid = H / 2;
    const max = Math.max(...values.map(Math.abs), 0.0001);

    // Zero line
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();
    ctx.setLineDash([]);

    // Only draw as many bars as we have values
    // Bar width is fixed — thin like reference, centered in canvas
    const BAR_W   = 3;
    const BAR_GAP = 1;
    const STEP    = BAR_W + BAR_GAP;
    const totalW  = values.length * STEP;

    // Center the bars horizontally
    const startX  = (W - totalW) / 2;

    values.forEach((v, i) => {
      const x    = startX + i * STEP;
      const prev = i > 0 ? values[i - 1] : v;
      const bh   = Math.max(1, (Math.abs(v) / max) * (mid - 6));
      const isPos = v >= 0;

      // Gold when momentum increasing, dark when decreasing
      // AC: blue rising / gold falling
      // AO: gold rising / blue falling  
      let color;
      if (type === "ac") {
        color = v >= prev ? "#2979FF" : "#FFD600";
      } else {
        color = v >= prev ? "#FFD600" : "#2979FF";
      }

      ctx.fillStyle = color;
      ctx.fillRect(x, isPos ? mid - bh : mid, BAR_W, bh);
    });
  };

  useEffect(() => {
    draw();
    const t = setTimeout(draw, 80);
    return () => clearTimeout(t);
  }, [values, type]);

  useEffect(() => {
    const ro = new ResizeObserver(() => draw());
    if (canvasRef.current) ro.observe(canvasRef.current.parentElement);
    return () => ro.disconnect();
  }, [values]);

  return <canvas ref={canvasRef} className="osc-canvas" />;
}
