import { useEffect, useRef, useState, useCallback } from "react";

export default function CandleChart({ candles = [], currentPrice = 0, asset = "", timeframe = "M1" }) {
  const canvasRef  = useRef(null);
  const [timer, setTimer]   = useState(60);
  const [alert, setAlert]   = useState(false);

  // Pan state — X (candle scroll) and Y (price scroll)
  const offsetXRef  = useRef(0);
  const offsetYRef  = useRef(0);
  const isDragging  = useRef(false);
  const lastPos     = useRef({ x: 0, y: 0 });
  const canvasData  = useRef({ candles, currentPrice });
  canvasData.current = { candles, currentPrice };

  // Timer — M1 specific countdown, other TFs show candle count
  useEffect(() => {
    const tick = () => {
      const secs = 60 - new Date().getSeconds();
      const s    = secs <= 0 ? 60 : secs;
      setTimer(s);
      if (s <= 10) {
        setAlert(true);
        if (navigator.vibrate) navigator.vibrate(40);
        try {
          const ctx  = new (window.AudioContext || window.webkitAudioContext)();
          const osc  = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = s <= 3 ? 1100 : 880;
          gain.gain.setValueAtTime(0.12, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
          osc.start(); osc.stop(ctx.currentTime + 0.1);
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
    const { candles, currentPrice } = canvasData.current;
    if (!canvas) return;

    const ctx  = canvas.getContext("2d");
    const DPR  = window.devicePixelRatio || 1;
    const W    = canvas.offsetWidth  || canvas.parentElement?.clientWidth || 360;
    const H    = canvas.offsetHeight || 220;

    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR);

    const AXIS_W  = 72;
    const chartW  = W - AXIS_W;
    const PAD_TOP = 28;
    const PAD_BOT = 6;
    const chartH  = H - PAD_TOP - PAD_BOT;

    ctx.fillStyle = "#0A0D12";
    ctx.fillRect(0, 0, W, H);

    if (!candles.length) return;

    // Visible slice — X pan
    const SHOW    = 60;
    const total   = candles.length;
    // offsetXRef: positive = scroll left (see older candles)
    const endIdx  = Math.max(SHOW, Math.min(total, total - offsetXRef.current));
    const startIdx = Math.max(0, endIdx - SHOW);
    const slice   = candles.slice(startIdx, endIdx);
    if (!slice.length) return;

    // Price range + Y pan
    const highs   = slice.map(c => parseFloat(c.high));
    const lows    = slice.map(c => parseFloat(c.low));
    let maxP      = Math.max(...highs, currentPrice || 0);
    let minP      = Math.min(...lows,  currentPrice || 99999);
    const rawRange = maxP - minP || 1;
    const pad     = rawRange * 0.1;
    maxP += pad; minP -= pad;

    // Y pan in price units
    const pxPerPrice  = chartH / (maxP - minP);
    const priceShift  = offsetYRef.current / pxPerPrice;
    maxP += priceShift;
    minP += priceShift;
    const range = maxP - minP || 1;
    const toY   = p => PAD_TOP + chartH - ((parseFloat(p) - minP) / range) * chartH;

    // Grid lines
    ctx.strokeStyle = "rgba(0,229,255,0.05)";
    ctx.lineWidth   = 1;
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
      const color = bull ? "#D4AF37" : "#2979FF";

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

    // Price dashed line
    if (currentPrice) {
      const py = toY(currentPrice);
      if (py > PAD_TOP && py < H - PAD_BOT) {
        ctx.strokeStyle = "rgba(0,229,255,0.5)";
        ctx.lineWidth   = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(chartW, py); ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = "#00E5FF";
        ctx.fillRect(chartW + 1, py - 10, AXIS_W - 2, 20);
        ctx.fillStyle = "#0A0D12";
        ctx.font      = `bold 10px 'Share Tech Mono', monospace`;
        ctx.textAlign = "left";
        ctx.fillText(parseFloat(currentPrice).toFixed(2), chartW + 5, py + 4);
      }
    }

    // Axis line + labels
    ctx.strokeStyle = "rgba(0,229,255,0.08)";
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(chartW, 0); ctx.lineTo(chartW, H); ctx.stroke();

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
  }, []);

  useEffect(() => { draw(); }, [candles, currentPrice, draw]);

  // Pointer events — full XY pan
  const onDown = (e) => {
    isDragging.current = true;
    const p = e.touches ? e.touches[0] : e;
    lastPos.current = { x: p.clientX, y: p.clientY };
  };

  const onMove = (e) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const p  = e.touches ? e.touches[0] : e;
    const dx = p.clientX - lastPos.current.x;
    const dy = p.clientY - lastPos.current.y;
    lastPos.current = { x: p.clientX, y: p.clientY };

    // X — scroll candles left/right
    const total = canvasData.current.candles.length;
    offsetXRef.current = Math.max(-(total - 20), Math.min(total - 20, offsetXRef.current - Math.round(dx / 5)));
    // Y — pan price up/down
    offsetYRef.current = offsetYRef.current + dy;
    draw();
  };

  const onUp = () => { isDragging.current = false; };

  // Double tap to reset pan
  const lastTap = useRef(0);
  const onTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      offsetXRef.current = 0;
      offsetYRef.current = 0;
      draw();
    }
    lastTap.current = now;
  };

  const mm = String(Math.floor(timer / 60)).padStart(2, "0");
  const ss = String(timer % 60).padStart(2, "0");

  return (
    <div className="chart-wrap"
      onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
      onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
      onClick={onTap}
      style={{ touchAction: "none" }}>
      <div className="chart-header">
        <span className="chart-label">{asset.replace("_", "")} {timeframe}</span>
        <span className={`chart-timer ${alert ? "timer-alert" : ""}`}>{mm}:{ss}</span>
      </div>
      <canvas ref={canvasRef} className="candle-canvas" />
    </div>
  );
}
