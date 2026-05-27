import { useEffect, useRef } from "react";

// type: "ac" = blue bars, "ao" = yellow bars (matching reference image 2)
export default function OscillatorChart({ values = [], type = "ao" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !values.length) return;
    const ctx  = canvas.getContext("2d");
    const DPR  = window.devicePixelRatio || 1;
    const W    = canvas.offsetWidth;
    const H    = canvas.offsetHeight;
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR);

    ctx.fillStyle = "#0A0D12";
    ctx.fillRect(0, 0, W, H);

    const max  = Math.max(...values.map(Math.abs), 0.0001);
    const mid  = H / 2;
    const barW = Math.max(2, W / values.length - 0.5);

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

      // AC = blue increasing / yellow decreasing
      // AO = yellow increasing / blue decreasing
      let color;
      if (type === "ac") {
        color = v >= prev ? "#2979FF" : "#FFD600";
      } else {
        color = v >= prev ? "#FFD600" : "#2979FF";
      }

      ctx.fillStyle = color;
      ctx.fillRect(x, isPos ? mid - bh : mid, barW, bh);
    });
  }, [values, type]);

  return <canvas ref={canvasRef} className="osc-canvas" />;
}
