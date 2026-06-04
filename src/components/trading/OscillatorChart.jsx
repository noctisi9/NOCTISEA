import { useEffect, useRef } from "react";

export default function OscillatorChart({ values = [], type = "ao" }) {
  const canvasRef = useRef(null);
  const wrapRef   = useRef(null);
  const rafRef    = useRef(null);

  const draw = () => {
    const canvas = canvasRef.current;
    const wrap   = wrapRef.current;
    if (!canvas || !wrap) return;

    // Keep retrying until we get a real width (slide may be off-screen)
    const W = wrap.offsetWidth;
    const H = wrap.offsetHeight;
    if (W < 10 || H < 10) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const ctx = canvas.getContext("2d");
    const DPR = window.devicePixelRatio || 1;
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width  = W + "px";
    canvas.style.height = H + "px";
    ctx.scale(DPR, DPR);

    ctx.fillStyle = "#0A0D12";
    ctx.fillRect(0, 0, W, H);

    if (!values || values.length < 2) return;

    const AXIS_W = 50;
    const chartW = W - AXIS_W;
    const mid    = H / 2;
    const max    = Math.max(...values.map(Math.abs), 0.0001);

    // Zero line
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(chartW, mid); ctx.stroke();
    ctx.setLineDash([]);

    // MT5 reference lines
    [0.4, 0.75].forEach(f => {
      [mid - f*(mid-4), mid + f*(mid-4)].forEach(y => {
        ctx.strokeStyle = "rgba(201,168,76,0.06)";
        ctx.lineWidth = 1; ctx.setLineDash([2, 6]);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
        ctx.setLineDash([]);
      });
    });

    // MT5 paired bars full width
    const n     = values.length;
    const pairW = chartW / n;
    const barW  = Math.max(1, pairW * 0.46);

    values.forEach((v, i) => {
      const prev   = i > 0 ? values[i-1] : v;
      const rising = v >= prev;
      const bh     = Math.max(1, (Math.abs(v) / max) * (mid - 5));
      const isPos  = v >= 0;
      const x      = i * pairW;

      ctx.fillStyle = rising ? "#C9A84C" : "rgba(201,168,76,0.15)";
      ctx.fillRect(x, isPos ? mid - bh : mid, barW, bh);

      const prevBh = Math.max(1, (Math.abs(prev) / max) * (mid - 5));
      ctx.fillStyle = rising ? "#1A2840" : "#2A3D5A";
      ctx.fillRect(x + barW + 0.5, prev >= 0 ? mid - prevBh : mid, barW, prevBh);
    });

    // AC wave overlay
    if (type === "ac") {
      ctx.beginPath();
      ctx.strokeStyle = "rgba(201,168,76,0.5)";
      ctx.lineWidth = 1.5;
      ctx.shadowColor = "#C9A84C";
      ctx.shadowBlur  = 4;
      values.forEach((v, i) => {
        const x = i * pairW + pairW / 2;
        const y = mid - (v / max) * (mid - 5);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      });
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Price axis right
    ctx.fillStyle = "rgba(201,168,76,0.3)";
    ctx.font = "9px 'Share Tech Mono',monospace";
    ctx.textAlign = "right";
    ctx.fillText( max.toFixed(4), W - 2, 10);
    ctx.fillText("0.0000",        W - 2, mid + 4);
    ctx.fillText((-max).toFixed(4), W - 2, H - 3);

    // Time axis bottom
    ctx.fillStyle = "rgba(201,168,76,0.2)";
    ctx.font = "8px 'Share Tech Mono',monospace";
    ctx.textAlign = "center";
    const now = new Date();
    for (let i = 0; i < 5; i++) {
      const t = new Date(now - (4-i) * 60000);
      ctx.fillText(t.toTimeString().slice(0,5), chartW * ((i+1)/6), H - 2);
    }
  };

  useEffect(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [values, type]);

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(draw);
    });
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => ro.disconnect();
  }, [values]);

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
