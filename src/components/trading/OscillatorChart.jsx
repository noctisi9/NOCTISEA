import { useEffect, useRef } from "react";

/**
 * MT5-style histogram — thin individual bars forming a wave
 * AC = blue bars, AO = red bars
 * Each bar: color depends on whether value increased or decreased vs previous
 */
export default function OscillatorChart({ values = [], type = "ao" }) {
  const canvasRef = useRef(null);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || values.length < 2) return;

    const ctx = canvas.getContext("2d");
    const DPR = window.devicePixelRatio || 1;
    const W   = canvas.parentElement?.clientWidth || window.innerWidth;
    const H   = canvas.clientHeight || 100;

    canvas.width       = W * DPR;
    canvas.height      = H * DPR;
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
    ctx.scale(DPR, DPR);

    ctx.fillStyle = "#0A0D12";
    ctx.fillRect(0, 0, W, H);

    const mid = H / 2;
    const max = Math.max(...values.map(Math.abs), 0.0001);

    // Each bar is thin — like MT5
    const barW   = Math.max(1.5, (W / values.length) - 1);
    const gap    = Math.max(0.5, (W / values.length) * 0.2);

    // Zero line
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(W, mid);
    ctx.stroke();
    ctx.setLineDash([]);

    values.forEach((v, i) => {
      const prev   = i > 0 ? values[i - 1] : v;
      const x      = i * (barW + gap);
      const bh     = Math.max(1, (Math.abs(v) / max) * (mid - 3));
      const isPos  = v >= 0;
      const rising = v >= prev;

      // AC = blue tones, AO = red tones
      // Rising = brighter, falling = darker (exactly like MT5)
      let color;
      if (type === "ac") {
        color = rising ? "#2979FF" : "#1A4FBB";
      } else {
        color = rising ? "#FF3B5C" : "#AA1F3A";
      }

      ctx.fillStyle = color;
      ctx.fillRect(
        x,
        isPos ? mid - bh : mid,
        barW,
        bh
      );
    });
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

  return <canvas ref={canvasRef} className="osc-canvas" />;
}
