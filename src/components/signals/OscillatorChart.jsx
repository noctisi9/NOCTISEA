import { useEffect, useRef } from "react";

export default function OscillatorChart({ values = [], color = "#D4AF37", label = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !values.length) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const max = Math.max(...values.map(Math.abs), 0.0001);
    const mid = H / 2;
    const barW = Math.max(2, W / values.length - 1);

    // Zero line
    ctx.strokeStyle = "rgba(212,175,55,0.2)";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(W, mid);
    ctx.stroke();
    ctx.setLineDash([]);

    values.forEach((v, i) => {
      const x = i * (barW + 1);
      const barH = (Math.abs(v) / max) * (mid - 4);
      const isPos = v >= 0;
      const prevV = i > 0 ? values[i - 1] : v;
      let barColor;
      if (isPos) {
        barColor = v > prevV ? "#D4AF37" : "#AA7C11";
      } else {
        barColor = v < prevV ? "#7B3F3F" : "#C0392B";
      }
      ctx.fillStyle = barColor;
      ctx.fillRect(x, isPos ? mid - barH : mid, barW, barH || 1);
    });
  }, [values]);

  return (
    <div className="oscillator-wrap">
      <canvas ref={canvasRef} className="oscillator-canvas" width={320} height={72} />
    </div>
  );
}
