import { useEffect, useRef, useState, useCallback } from "react";

export default function CandleChart({ candles = [], currentPrice = 0, asset = "", timeframe = "M1", fullHeight = false }) {
  const canvasRef  = useRef(null);
  const [timer, setTimer]   = useState(60);
  const [alert, setAlert]   = useState(false);
  const offsetXRef  = useRef(0);
  const offsetYRef  = useRef(0);
  const scaleRef    = useRef(1);
  const isDragging  = useRef(false);
  const lastPos     = useRef({ x: 0, y: 0 });
  const lastDist    = useRef(0);
  const dataRef     = useRef({ candles, currentPrice });
  dataRef.current   = { candles, currentPrice };

  // Timer countdown
  useEffect(() => {
    const tick = () => {
      const s = 60 - new Date().getSeconds() || 60;
      setTimer(s);
      if (s <= 10) {
        setAlert(true);
        if (navigator.vibrate) navigator.vibrate(40);
        try {
          const ac  = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ac.createOscillator();
          const g   = ac.createGain();
          osc.connect(g); g.connect(ac.destination);
          osc.frequency.value = s <= 3 ? 1100 : 880;
          g.gain.setValueAtTime(0.1, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
          osc.start(); osc.stop(ac.currentTime + 0.1);
        } catch(e) {}
      } else { setAlert(false); }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const { candles, currentPrice } = dataRef.current;
    const ctx  = canvas.getContext("2d");
    const DPR  = window.devicePixelRatio || 1;
    const W    = canvas.offsetWidth  || canvas.parentElement?.clientWidth || 360;
    const H    = canvas.offsetHeight || (fullHeight ? 300 : 220);
    canvas.width  = W * DPR;
    canvas.height = H * DPR;
    ctx.scale(DPR, DPR);

    const AXIS_W = 72;
    const chartW = W - AXIS_W;
    const PAD_T  = 28;
    const PAD_B  = 6;
    const chartH = H - PAD_T - PAD_B;

    ctx.fillStyle = "#0A0D12";
    ctx.fillRect(0, 0, W, H);
    if (!candles.length) return;

    const scale  = scaleRef.current;
    const SHOW   = Math.max(20, Math.round(60 / scale));
    const total  = candles.length;
    const endIdx = Math.max(SHOW, Math.min(total, total - offsetXRef.current));
    const startIdx = Math.max(0, endIdx - SHOW);
    const slice  = candles.slice(startIdx, endIdx);
    if (!slice.length) return;

    const highs  = slice.map(c => parseFloat(c.high));
    const lows   = slice.map(c => parseFloat(c.low));
    let maxP     = Math.max(...highs, currentPrice || 0);
    let minP     = Math.min(...lows, currentPrice || 99999);
    const pad    = (maxP - minP) * 0.1 || 1;
    maxP += pad; minP -= pad;
    const shift  = offsetYRef.current / (chartH / (maxP - minP));
    maxP += shift; minP += shift;
    const range  = maxP - minP || 1;
    const toY    = p => PAD_T + chartH - ((parseFloat(p) - minP) / range) * chartH;

    // Grid
    ctx.strokeStyle = "rgba(0,229,255,0.05)";
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 6]);
    for (let i = 0; i <= 5; i++) {
      const y = PAD_T + (chartH / 5) * i;
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
      const bull  = close >= open;
      const color = bull ? "#D4AF37" : "#2979FF";
      ctx.strokeStyle = color; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, toY(parseFloat(c.high)));
      ctx.lineTo(x, toY(parseFloat(c.low)));
      ctx.stroke();
      const bTop = toY(Math.max(open, close));
      const bH   = Math.max(1, toY(Math.min(open, close)) - bTop);
      ctx.fillStyle = color;
      ctx.fillRect(x - barW / 2, bTop, barW, bH);
    });

    // Price line
    if (currentPrice) {
      const py = toY(currentPrice);
      if (py > PAD_T && py < H - PAD_B) {
        ctx.strokeStyle = "rgba(0,229,255,0.55)";
        ctx.lineWidth   = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(chartW, py); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle   = "#00E5FF";
        ctx.fillRect(chartW + 1, py - 10, AXIS_W - 2, 20);
        ctx.fillStyle   = "#0A0D12";
        ctx.font        = `bold 10px 'Share Tech Mono', monospace`;
        ctx.textAlign   = "left";
        ctx.fillText(parseFloat(currentPrice).toFixed(2), chartW + 5, py + 4);
      }
    }

    // Price axis
    ctx.strokeStyle = "rgba(0,229,255,0.07)";
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(chartW, 0); ctx.lineTo(chartW, H); ctx.stroke();
    ctx.fillStyle   = "#607080";
    ctx.font        = `10px 'Share Tech Mono', monospace`;
    ctx.textAlign   = "left";
    for (let i = 0; i <= 5; i++) {
      const price = minP + (range / 5) * (5 - i);
      const y     = PAD_T + (chartH / 5) * i;
      if (!currentPrice || Math.abs(toY(currentPrice) - y) > 14) {
        ctx.fillText(price.toFixed(2), chartW + 5, y + 4);
      }
    }
  }, [fullHeight]);

  useEffect(() => { draw(); }, [candles, currentPrice, draw]);

  // Pointer events
  const onDown = (e) => {
    isDragging.current = true;
    const p = e.touches ? e.touches[0] : e;
    lastPos.current = { x: p.clientX, y: p.clientY };
    if (e.touches?.length === 2) {
      lastDist.current = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
    }
  };

  const onMove = (e) => {
    if (!isDragging.current) return;
    // Pinch zoom
    if (e.touches?.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist - lastDist.current;
      scaleRef.current = Math.max(0.5, Math.min(5, scaleRef.current + delta * 0.01));
      lastDist.current = dist;
      draw();
      return;
    }
    e.preventDefault();
    const p  = e.touches ? e.touches[0] : e;
    const dx = p.clientX - lastPos.current.x;
    const dy = p.clientY - lastPos.current.y;
    lastPos.current = { x: p.clientX, y: p.clientY };
    const total = dataRef.current.candles.length;
    offsetXRef.current = Math.max(-(total - 20), Math.min(total - 20, offsetXRef.current - Math.round(dx / 5)));
    offsetYRef.current += dy;
    draw();
  };

  const onUp = () => { isDragging.current = false; };

  // Double tap reset
  const lastTap = useRef(0);
  const onTap   = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      offsetXRef.current = 0;
      offsetYRef.current = 0;
      scaleRef.current   = 1;
      draw();
    }
    lastTap.current = now;
  };

  const mm = String(Math.floor(timer / 60)).padStart(2, "0");
  const ss = String(timer % 60).padStart(2, "0");

  return (
    <div className="chart-wrap"
      style={{ touchAction: "none" }}
      onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
      onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
      onClick={onTap}>
      <div className="chart-header">
        <span className="chart-label">{asset.replace("_","")} {timeframe}</span>
        <span className={`chart-timer ${alert ? "timer-alert" : ""}`}>{mm}:{ss}</span>
      </div>
      <canvas ref={canvasRef} className={fullHeight ? "candle-canvas-full" : "candle-canvas"} />
    </div>
  );
}
