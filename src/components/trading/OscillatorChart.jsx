import { useEffect, useRef } from "react";

/**
 * Renders oscillator exactly like MT5:
 * - Each candle = two side-by-side thin bars (current value + previous value)
 * - Gold = current bar, Dark = previous bar (comparison pair)
 * - Both positive and negative, zero line centered
 * - Bars naturally sized and left-aligned as data accumulates
 */
export default function OscillatorChart({ values = [], type = "ao" }) {
  const canvasRef = useRef(null);

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas || values.length < 2) return;

    const ctx = canvas.getContext("2d");
    const DPR = window.devicePixelRatio || 1;
    const W   = canvas.parentElement?.clientWidth || window.innerWidth;
    const H   = canvas.clientHeight || 110;

    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
    ctx.scale(DPR, DPR);

    // Background
    ctx.fillStyle = "#0A0D12";
    ctx.fillRect(0, 0, W, H);

    const mid  = H / 2;
    const max  = Math.max(...values.map(Math.abs), 0.0001);

    // MT5 uses paired bars — current + previous side by side
    // Each "group" = 2 thin bars
    const pairW   = Math.max(3, W / values.length);
    const thinBar = Math.max(1, pairW * 0.45);

    // Zero line
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(W, mid);
    ctx.stroke();
    ctx.setLineDash([]);

    values.forEach((v, i) => {
      if (i === 0) return;
      const prev  = values[i - 1];
      const x     = i * pairW;

      // Current bar height
      const curH  = Math.max(1, (Math.abs(v) / max) * (mid - 4));
      // Previous bar height
      const prvH  = Math.max(1, (Math.abs(prev) / max) * (mid - 4));

      const curIsPos = v >= 0;
      const prvIsPos = prev >= 0;

      // MT5 color logic:
      // Gold = current value bar
      // Dark charcoal = previous value bar (the "shadow" comparison)
      const goldColor = "#D4AF37";
      const darkColor = "#3A3A3A";

      // Draw previous bar (dark) — left of pair
      ctx.fillStyle = darkColor;
      ctx.fillRect(
        x - thinBar,
        prvIsPos ? mid - prvH : mid,
        thinBar,
        prvH
      );

      // Draw current bar (gold) — right of pair
      ctx.fillStyle = goldColor;
      ctx.fillRect(
        x,
        curIsPos ? mid - curH : mid,
        thinBar,
        curH
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
