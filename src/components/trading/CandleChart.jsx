import { useEffect, useRef, useState } from "react";

export default function CandleChart({ candles = [], currentPrice = 0, asset = "" }) {
  const canvasRef  = useRef(null);
  const [timer, setTimer] = useState(60);
  // pan/zoom state
  const offsetRef  = useRef(0);
  const isDragging = useRef(false);
  const lastX      = useRef(0);
  const visibleRef = useRef(60);

  // Candle countdown timer
  useEffect(() => {
    const tick = () => setTimer(60 - new Date().getSeconds() || 60);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Touch/mouse pan
  const onPointerDown = (e) => { isDragging.current = true; lastX.current = e.touches ? e.touches[0].clientX : e.clientX; };
  const onPointerMove = (e) => {
    if (!isDragging.current) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const dx = x - lastX.current;
    lastX.current = x;
    offsetRef.current = Math.max(0, Math.min(candles.length - 20, offsetRef.current - Math.round(dx / 8)));
    drawChart();
  };
  const onPointerUp = () => { isDragging.current = false; };

  const drawChart = () => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length < 2) return;
    const ctx   = canvas.getContext("2d");
    const DPR   = window.devicePixelRatio || 1;
    const W     = canvas.offsetWidth;
    const H     = canvas.offsetHeight;
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR);

    const AXIS_W    = 72;
    const chartW    = W - AXIS_W;
    const PAD_TOP   = 24;
    const PAD_BOT   = 8;
    const chartH    = H - PAD_TOP - PAD_BOT;

    ctx.fillStyle = "#0A0D12";
    ctx.fillRect(0, 0, W, H);

    const total   = candles.length;
    const visible = Math.min(visibleRef.current, total);
    const startIdx = Math.max(0, total - visible - offsetRef.current);
    const endIdx   = Math.min(total, startIdx + visible);
    const slice    = candles.slice(startIdx, endIdx);
    if (!slice.length) return;

    const highs = slice.map(c => parseFloat(c.high));
    const lows  = slice.map(c => parseFloat(c.low));
    let maxP = Math.max(...highs, currentPrice || 0);
    let minP = Math.min(...lows,  currentPrice || Infinity);
    const pad = (maxP - minP) * 0.08 || 1;
    maxP += pad; minP -= pad;
    const range = maxP - minP || 1;
    const toY = p => PAD_TOP + chartH - ((parseFloat(p) - minP) / range) * chartH;

    // Grid lines
    ctx.strokeStyle = "rgba(0,229,255,0.05)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 6]);
    for (let i = 0; i <= 4; i++) {
      const y = PAD_TOP + (chartH / 4) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
    }
    ctx.setLineDash([]);

    const barGap = chartW / slice.length;
    const barW   = Math.max(1.5, barGap * 0.65);

    slice.forEach((c, i) => {
      const x     = i * barGap + barGap / 2;
      const open  = parseFloat(c.open);
      const close = parseFloat(c.close);
      const high  = parseFloat(c.high);
      const low   = parseFloat(c.low);
      const bull  = close >= open;
      const color = bull ? "#00FF88" : "#FF3B5C";

      ctx.strokeStyle = color;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(x, toY(high));
      ctx.lineTo(x, toY(low));
      ctx.stroke();

      const bodyTop = toY(Math.max(open, close));
      const bodyH   = Math.max(1, toY(Math.min(open, close)) - bodyTop);
      ctx.fillStyle = color;
      ctx.fillRect(x - barW / 2, bodyTop, barW, bodyH);
    });

    // Current price line
    if (currentPrice) {
      const py = toY(currentPrice);
      ctx.strokeStyle = "rgba(0,229,255,0.5)";
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(chartW, py); ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle   = "#00E5FF";
      ctx.fillRect(chartW + 1, py - 10, AXIS_W - 2, 20);
      ctx.fillStyle   = "#0A0D12";
      ctx.font        = `bold 10px 'Share Tech Mono', monospace`;
      ctx.textAlign   = "left";
      ctx.fillText(currentPrice.toFixed(2), chartW + 5, py + 4);
    }

    // Price axis
    ctx.strokeStyle = "rgba(0,229,255,0.08)";
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(chartW, 0); ctx.lineTo(chartW, H); ctx.stroke();
    ctx.fillStyle   = "#607080";
    ctx.font        = `10px 'Share Tech Mono', monospace`;
    ctx.textAlign   = "left";
    for (let i = 0; i <= 4; i++) {
      const price = minP + (range / 4) * (4 - i);
      const y     = PAD_TOP + (chartH / 4) * i;
      if (Math.abs(toY(currentPrice) - y) > 14) {
        ctx.fillText(price.toFixed(2), chartW + 5, y + 4);
      }
    }
  };

  useEffect(() => { drawChart(); }, [candles, currentPrice]);

  const mm = String(Math.floor(timer / 60)).padStart(2, "0");
  const ss = String(timer % 60).padStart(2, "0");

  return (
    <div className="chart-wrap"
      onMouseDown={onPointerDown} onMouseMove={onPointerMove} onMouseUp={onPointerUp} onMouseLeave={onPointerUp}
      onTouchStart={onPointerDown} onTouchMove={onPointerMove} onTouchEnd={onPointerUp}>
      <div className="chart-header">
        <span className="chart-label">{asset.replace("_","")} M1</span>
        <span className="chart-timer">{mm}:{ss}</span>
      </div>
      <canvas ref={canvasRef} className="candle-canvas" />
    </div>
  );
}
