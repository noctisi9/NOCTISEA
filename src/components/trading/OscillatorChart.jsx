import { useEffect, useRef } from "react";

export default function OscillatorChart({ values = [], type = "ao" }) {
  const canvasRef = useRef(null);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || !values.length) return;
    const ctx  = canvas.getContext("2d");
    const DPR  = window.devicePixelRatio || 1;

    // Force full parent width
    const parent = canvas.parentElement;
    const W = parent ? parent.clientWidth : window.innerWidth;
    const H = canvas.clientHeight || 110;

    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
    ctx.scale(DPR, DPR);

    // Background
    ctx.fillStyle = "#0A0D12";
    ctx.fillRect(0, 0, W, H);

    const max  = Math.max(...values.map(Math.abs), 0.0001);
    const mid  = H / 2;
    const barW = Math.max(2, (W / values.length) - 0.5);

    // Zero line
    ctx.strokeStyle = "rgba(0,229,255,0.12)";
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();
    ctx.setLineDash([]);

    values.forEach((v, i) => {
      const x    = i * (barW + 0.5);
      const bh   = Math.max(1, (Math.abs(v) / max) * (mid - 3));
      const prev = i > 0 ? values[i - 1] : v;
      const isPos = v >= 0;

      // AC = blue when rising, yellow when falling
      // AO = yellow when rising, blue when falling
      let color;
      if (type === "ac") {
        color = v >= prev ? "#2979FF" : "#FFD600";
      } else {
        color = v >= prev ? "#FFD600" : "#2979FF";
      }

      ctx.fillStyle = color;
      ctx.fillRect(x, isPos ? mid - bh : mid, barW, bh);
    });
  };

  useEffect(() => {
    // Draw immediately and again after a short delay to catch layout
    draw();
    const t = setTimeout(draw, 100);
    return () => clearTimeout(t);
  }, [values, type]);

  // Redraw on window resize
  useEffect(() => {
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, [values]);

  return <canvas ref={canvasRef} className="osc-canvas" />;
}
