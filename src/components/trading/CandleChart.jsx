import { useEffect, useRef, useState, useCallback } from "react";

export default function CandleChart({ candles = [], currentPrice = 0, asset = "" }) {
  const canvasRef   = useRef(null);
  const [timer, setTimer] = useState(60);
  const [alert, setAlert] = useState(false);

  // Pan state — supports both X and Y
  const offsetXRef  = useRef(0); // candle scroll
  const offsetYRef  = useRef(0); // price scroll (px)
  const isDragging  = useRef(false);
  const lastPos     = useRef({ x: 0, y: 0 });
  const drawRef     = useRef(null);

  // Candle countdown timer with 10s alert
  useEffect(() => {
    const tick = () => {
      const secs = 60 - new Date().getSeconds();
      const s = secs === 60 ? 60 : secs;
      setTimer(s);
      if (s <= 10) {
        setAlert(true);
        // Vibrate on supported devices
        if (navigator.vibrate) navigator.vibrate(50);
        // Play short beep via AudioContext
        try {
          const ctx = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.frequency.value = s === 10 ? 880 : 660;
          gain.gain.setValueAtTime(0.15, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.12);
        } catch(e) {}
      } else {
        setAlert(false);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length < 2) return;
    const ctx  = canvas.getContext("2d");
    const DPR  = window.devicePixelRatio || 1;
    const W    = canvas.offsetWidth;
    const H    = canvas.offsetHeight;
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR);

    const AXIS_W  = 72;
    const chartW  = W - AXIS_W;
    const PAD_TOP = 28;
    const PAD_BOT = 8;
    const chartH  = H - PAD_TOP - PAD_BOT;

    ctx.fillStyle = "#0A0D12";
    ctx.fillRect(0, 0, W, H);

    // Visible slice with X pan
    const visible  = 60;
    const total    = candles.length;
    const startIdx = Math.max(0, Math.min(total - visible, total - visible - offsetXRef.current));
    const endIdx   = Math.min(total, startIdx + visible);
    const slice    = candles.slice(startIdx, endIdx);
    if (!slice.length) return;

    // Price range with Y pan offset
    const highs = slice.map(c => parseFloat(c.high));
    const lows  = slice.map(c => parseFloat(c.low));
    let maxP = Math.max(...highs, currentPrice || 0);
    let minP = Math.min(...lows,  currentPrice || Infinity);
    const rawRange = maxP - minP || 1;
    const pad = rawRange * 0.1;
    maxP += pad; minP -= pad;

    // Y offset in price units
    const yOffsetPx   = offsetYRef.current;
    const pxPerPrice  = chartH / (maxP - minP);
    const priceOffset = yOffsetPx / pxPerPrice;
    maxP += priceOffset; minP += priceOffset;
    const range = maxP - minP || 1;

    const toY = p => PAD_TOP + chartH - ((parseFloat(p) - minP) / range) * chartH;

    // Grid
    ctx.strokeStyle = "rgba(0,229,255,0.05)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 6]);
    for (let i = 0; i <= 5; i++) {
      const y = PAD_TOP + (chartH / 5) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Candles — gold bull, blue bear
    const barGap = chartW / Math.max(slice.length, 1);
    const barW   = Math.max(1.5, barGap * 0.65);

    slice.forEach((c, i) => {
      const x     = i * barGap + barGap / 2;
      const open  = parseFloat(c.open);
      const close = parseFloat(c.close);
      const high  = parseFloat(c.high);
      const low   = parseFloat(c.low);
      const bull  = close >= open;
      const color = bull ? "#D4AF37" : "#2979FF"; // gold / blue

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(x, toY(high));
      ctx.lineTo(x, toY(low));
      ctx.stroke();

      // Body
      const bodyTop = toY(Math.max(open, close));
      const bodyH   = Math.max(1, toY(Math.min(open, close)) - bodyTop);
      ctx.fillStyle = color;
      ctx.fillRect(x - barW / 2, bodyTop, barW, bodyH);
    });

    // Current price dashed line
    if (currentPrice) {
      const py = toY(currentPrice);
      ctx.strokeStyle = "rgba(0,229,255,0.6)";
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(chartW, py); ctx.stroke();
      ctx.setLineDash([]);

      // Price label
      ctx.fillStyle   = "#00E5FF";
      ctx.fillRect(chartW + 1, py - 10, AXIS_W - 2, 20);
      ctx.fillStyle   = "#0A0D12";
      ctx.font        = `bold 10px 'Share Tech Mono', monospace`;
      ctx.textAlign   = "left";
      ctx.fillText(parseFloat(currentPrice).toFixed(2), chartW + 5, py + 4);
    }

    // Price axis separator
    ctx.strokeStyle = "rgba(0,229,255,0.08)";
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(chartW, 0); ctx.lineTo(chartW, H); ctx.stroke();

    // Axis price labels
    ctx.fillStyle = "#607080";
    ctx.font      = `10px 'Share Tech Mono', monospace`;
    ctx.textAlign = "left";
    for (let i = 0; i <= 5; i++) {
      const price = minP + (range / 5) * (5 - i);
      const y     = PAD_TOP + (chartH / 5) * i;
      if (!currentPrice || Math.abs(toY(currentPrice) - y) > 14) {
        ctx.fillText(price.toFixed(2), chartW + 5, y + 4);
      }
    }
  }, [candles, currentPrice]);

  drawRef.current = draw;
  useEffect(() => { draw(); }, [draw]);

  // Pointer events — free X and Y pan
  const onDown = (e) => {
    isDragging.current = true;
    const pos = e.touches ? e.touches[0] : e;
    lastPos.current = { x: pos.clientX, y: pos.clientY };
  };
  const onMove = (e) => {
    if (!isDragging.current) return;
    const pos = e.touches ? e.touches[0] : e;
    const dx  = pos.clientX - lastPos.current.x;
    const dy  = pos.clientY - lastPos.current.y;
    lastPos.current = { x: pos.clientX, y: pos.clientY };
    // X pan — scroll candles
    offsetXRef.current = Math.max(-candles.length + 20, Math.min(0, offsetXRef.current + Math.round(dx / 6)));
    // Y pan — shift price view
    offsetYRef.current = offsetYRef.current + dy;
    drawRef.current?.();
  };
  const onUp = () => { isDragging.current = false; };

  const mm = String(Math.floor(timer / 60)).padStart(2, "0");
  const ss = String(timer % 60).padStart(2, "0");

  return (
    <div className="chart-wrap"
      onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
      onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}>
      <div className="chart-header">
        <span className="chart-label">{asset.replace("_", "")} M1</span>
        <span className={`chart-timer ${alert ? "timer-alert" : ""}`}>{mm}:{ss}</span>
      </div>
      <canvas ref={canvasRef} className="candle-canvas" />
    </div>
  );
}
