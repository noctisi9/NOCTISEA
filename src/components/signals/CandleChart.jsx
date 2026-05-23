import { useEffect, useRef, useState } from "react";

export default function CandleChart({ candles = [], currentPrice = 0, asset = "" }) {
  const canvasRef = useRef(null);
  const [timer, setTimer] = useState(60);
  const timerRef = useRef(null);

  // Candle timer — resets every 60s on M1
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    const now = new Date();
    const secondsLeft = 60 - now.getSeconds();
    setTimer(secondsLeft);
    timerRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1) return 60;
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length < 2) return;

    const ctx = canvas.getContext("2d");
    const DPR = window.devicePixelRatio || 1;
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR);

    const PRICE_AXIS_W = 72;
    const chartW = W - PRICE_AXIS_W;
    const PADDING_TOP = 12;
    const PADDING_BOT = 12;
    const chartH = H - PADDING_TOP - PADDING_BOT;

    // Clear
    ctx.fillStyle = "#0A0A0C";
    ctx.fillRect(0, 0, W, H);

    // Visible candles
    const visible = candles.slice(-60);
    const highs = visible.map(c => parseFloat(c.high));
    const lows  = visible.map(c => parseFloat(c.low));
    const maxP  = Math.max(...highs);
    const minP  = Math.min(...lows);
    const range = maxP - minP || 1;

    const toY = (price) =>
      PADDING_TOP + chartH - ((parseFloat(price) - minP) / range) * chartH;

    const barW    = Math.max(2, (chartW / visible.length) - 1);
    const barGap  = chartW / visible.length;

    // Grid lines
    ctx.strokeStyle = "rgba(212,175,55,0.06)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 6]);
    for (let i = 0; i <= 4; i++) {
      const y = PADDING_TOP + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartW, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Candles
    visible.forEach((c, i) => {
      const x      = i * barGap + barGap / 2;
      const open   = parseFloat(c.open);
      const close  = parseFloat(c.close);
      const high   = parseFloat(c.high);
      const low    = parseFloat(c.low);
      const isBull = close >= open;

      const bodyTop    = toY(Math.max(open, close));
      const bodyBot    = toY(Math.min(open, close));
      const bodyH      = Math.max(1, bodyBot - bodyTop);
      const wickTop    = toY(high);
      const wickBot    = toY(low);

      const color = isBull ? "#2ECC71" : "#E74C3C";

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, wickTop);
      ctx.lineTo(x, wickBot);
      ctx.stroke();

      // Body
      ctx.fillStyle = color;
      ctx.fillRect(x - barW / 2, bodyTop, barW, bodyH);
    });

    // Current price dashed line
    if (currentPrice) {
      const py = toY(currentPrice);
      ctx.strokeStyle = "rgba(212,175,55,0.6)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(chartW, py);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Price axis separator
    ctx.strokeStyle = "rgba(212,175,55,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartW, 0);
    ctx.lineTo(chartW, H);
    ctx.stroke();

    // Price axis labels
    ctx.fillStyle = "#8A8070";
    ctx.font = `10px 'Share Tech Mono', monospace`;
    ctx.textAlign = "left";
    for (let i = 0; i <= 4; i++) {
      const price = minP + (range / 4) * (4 - i);
      const y     = PADDING_TOP + (chartH / 4) * i;
      ctx.fillText(price.toFixed(2), chartW + 6, y + 4);
    }

    // Current price label on axis
    if (currentPrice) {
      const py = toY(currentPrice);
      ctx.fillStyle = "#D4AF37";
      ctx.fillRect(chartW + 1, py - 9, PRICE_AXIS_W - 2, 18);
      ctx.fillStyle = "#0A0A0C";
      ctx.font = `bold 10px 'Share Tech Mono', monospace`;
      ctx.fillText(parseFloat(currentPrice).toFixed(2), chartW + 5, py + 4);
    }
  }, [candles, currentPrice]);

  const mm  = String(Math.floor(timer / 60)).padStart(2, "0");
  const ss  = String(timer % 60).padStart(2, "0");

  return (
    <div className="candle-chart-wrap">
      <div className="candle-chart-header">
        <span className="candle-asset-label">
          {asset.replace("_", "")} M1
        </span>
        <span className="candle-timer">{mm}:{ss}</span>
      </div>
      <canvas ref={canvasRef} className="candle-canvas" />
    </div>
  );
}
