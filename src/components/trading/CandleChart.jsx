import { useEffect, useRef, useState, useCallback } from "react";

const FUTURE_ZONE_PX = 80;
const CANDLE_SPACING_RATIO = 0.55;

export default function CandleChart({
  candles = [], currentPrice = 0, asset = "", timeframe = "M1", flex = false,
  buyMarkers = [], sellMarkers = [], cycleMarkers = [],
}) {
  const canvasRef  = useRef(null);
  const wrapRef    = useRef(null);
  const [timer, setTimer] = useState(60);
  const [alert, setAlert] = useState(false);

  // pan: positive = scroll LEFT (see older candles), negative = scroll right
  const panX       = useRef(0);
  const panY       = useRef(0);
  const scaleRef   = useRef(1);
  const isDragging = useRef(false);
  const lastPos    = useRef({ x: 0, y: 0 });
  const lastDist   = useRef(0);
  const dataRef    = useRef({ candles, currentPrice });
  dataRef.current  = { candles, currentPrice };

  useEffect(() => {
    const tick = () => {
      const s = (60 - new Date().getSeconds()) || 60;
      setTimer(s); setAlert(s <= 10);
      if (s <= 10) {
        if (navigator.vibrate) navigator.vibrate(40);
        try {
          const ac = new (window.AudioContext || window.webkitAudioContext)();
          const osc = ac.createOscillator(), g = ac.createGain();
          osc.connect(g); g.connect(ac.destination);
          osc.frequency.value = s <= 3 ? 1100 : 880;
          g.gain.setValueAtTime(0.1, ac.currentTime);
          g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.1);
          osc.start(); osc.stop(ac.currentTime + 0.1);
        } catch (e) {}
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current, wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const { candles, currentPrice } = dataRef.current;
    const ctx = canvas.getContext("2d");
    const DPR = window.devicePixelRatio || 1;
    const W = wrap.clientWidth || 360, H = wrap.clientHeight || 220;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.scale(DPR, DPR);

    const AXIS_W = 72;
    const chartW = W - AXIS_W;
    const plotW  = chartW - FUTURE_ZONE_PX;
    const PAD_T = 28, PAD_B = 6;
    const chartH = H - PAD_T - PAD_B;

    ctx.fillStyle = "#0A0D12";
    ctx.fillRect(0, 0, W, H);

    if (!candles.length) {
      ctx.fillStyle = "rgba(0,229,255,0.3)";
      ctx.font = "11px 'Share Tech Mono', monospace";
      ctx.textAlign = "center";
      ctx.fillText("CONNECTING...", plotW / 2, H / 2);
      return;
    }

    const scale = scaleRef.current;
    // SHOW = candles visible; zoom in = fewer candles = larger bars
    const SHOW  = Math.max(5, Math.round(40 / scale));
    const total = candles.length;

    // panX > 0 means we scrolled LEFT (showing older data)
    // endIdx: which candle is the last visible (rightmost)
    // panX=0 → newest candle on right; panX=20 → 20 candles back
    const pan    = Math.round(panX.current);
    const endIdx = Math.max(SHOW, Math.min(total, total - pan));
    const startIdx = Math.max(0, endIdx - SHOW);
    const slice  = candles.slice(startIdx, endIdx);
    if (!slice.length) return;

    const highs = slice.map(c => parseFloat(c.high));
    const lows  = slice.map(c => parseFloat(c.low));
    let maxP = Math.max(...highs, currentPrice || 0);
    let minP = Math.min(...lows,  currentPrice || 99999);
    const rng = (maxP - minP) || 1;
    maxP += rng * 0.12; minP -= rng * 0.12;
    const pricePerPx = (maxP - minP) / chartH;
    maxP += panY.current * pricePerPx; minP += panY.current * pricePerPx;
    const range = (maxP - minP) || 1;
    const toY = p => PAD_T + chartH - ((parseFloat(p) - minP) / range) * chartH;

    // Grid
    ctx.strokeStyle = "rgba(0,229,255,0.05)"; ctx.lineWidth = 1; ctx.setLineDash([3, 6]);
    for (let i = 0; i <= 5; i++) {
      const y = PAD_T + (chartH / 5) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Future zone
    ctx.fillStyle = "rgba(0,229,255,0.018)";
    ctx.fillRect(plotW, PAD_T, FUTURE_ZONE_PX, chartH);
    ctx.strokeStyle = "rgba(0,229,255,0.18)"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(plotW, PAD_T); ctx.lineTo(plotW, PAD_T + chartH); ctx.stroke();
    ctx.setLineDash([]);
    ctx.save();
    ctx.translate(plotW + FUTURE_ZONE_PX / 2, PAD_T + chartH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = "rgba(0,229,255,0.2)"; ctx.font = "9px 'Share Tech Mono', monospace"; ctx.textAlign = "center";
    ctx.fillText("FUTURE ZONE", 0, 0); ctx.restore();

    // Candles — left = older, right = newer
    const barGap = plotW / Math.max(slice.length, 1);
    const barW   = Math.max(2, barGap * CANDLE_SPACING_RATIO);

    slice.forEach((c, i) => {
      const x = i * barGap + barGap / 2;
      const open = parseFloat(c.open), close = parseFloat(c.close);
      const high = parseFloat(c.high), low = parseFloat(c.low);
      const bull = close >= open;
      const color = bull ? "#D4AF37" : "#2979FF";

      ctx.strokeStyle = bull ? "rgba(212,175,55,0.8)" : "rgba(41,121,255,0.8)";
      ctx.lineWidth = Math.max(1, barW * 0.18);
      ctx.beginPath(); ctx.moveTo(x, toY(high)); ctx.lineTo(x, toY(low)); ctx.stroke();

      const bTop = toY(Math.max(open, close));
      const bH   = Math.max(1.5, toY(Math.min(open, close)) - bTop);
      ctx.fillStyle = color;
      ctx.fillRect(x - barW / 2, bTop, barW, bH);
      ctx.strokeStyle = bull ? "rgba(212,175,55,0.4)" : "rgba(41,121,255,0.4)"; ctx.lineWidth = 0.5;
      ctx.strokeRect(x - barW / 2, bTop, barW, bH);
    });

    // Markers
    (buyMarkers || []).forEach(m => {
      const idx = slice.findIndex(c => c.time === m.time); if (idx < 0) return;
      const x = idx * barGap + barGap / 2, y = toY(parseFloat(slice[idx].low)) + 14;
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,255,136,0.9)"; ctx.fill();
      ctx.strokeStyle = "#00FF88"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "#0A0D12"; ctx.font = "bold 8px monospace"; ctx.textAlign = "center";
      ctx.fillText("B", x, y + 3);
    });
    (sellMarkers || []).forEach(m => {
      const idx = slice.findIndex(c => c.time === m.time); if (idx < 0) return;
      const x = idx * barGap + barGap / 2, y = toY(parseFloat(slice[idx].high)) - 14;
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255,59,92,0.9)"; ctx.fill();
      ctx.strokeStyle = "#FF3B5C"; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = "bold 8px monospace"; ctx.textAlign = "center";
      ctx.fillText("S", x, y + 3);
    });
    (cycleMarkers || []).forEach(m => {
      const idx = slice.findIndex(c => c.time === m.time); if (idx < 0) return;
      const x = idx * barGap + barGap / 2, y = toY(parseFloat(slice[idx].high)) - 18;
      ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4);
      ctx.fillStyle = "rgba(255,214,0,0.9)"; ctx.fillRect(-5, -5, 10, 10); ctx.restore();
      ctx.fillStyle = "#FFD600"; ctx.font = "7px monospace"; ctx.textAlign = "center";
      ctx.fillText("↺", x, y + 3);
    });

    // Price line
    if (currentPrice) {
      const py = toY(currentPrice);
      if (py > PAD_T && py < H - PAD_B) {
        ctx.strokeStyle = "rgba(0,229,255,0.5)"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(chartW, py); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#00E5FF"; ctx.fillRect(chartW + 1, py - 10, AXIS_W - 2, 20);
        ctx.fillStyle = "#0A0D12"; ctx.font = "bold 10px 'Share Tech Mono', monospace"; ctx.textAlign = "left";
        ctx.fillText(parseFloat(currentPrice).toFixed(2), chartW + 5, py + 4);
      }
    }

    // Price axis
    ctx.strokeStyle = "rgba(0,229,255,0.07)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(chartW, 0); ctx.lineTo(chartW, H); ctx.stroke();
    ctx.fillStyle = "#607080"; ctx.font = "10px 'Share Tech Mono', monospace"; ctx.textAlign = "left";
    for (let i = 0; i <= 5; i++) {
      const price = minP + (range / 5) * (5 - i);
      const y = PAD_T + (chartH / 5) * i;
      if (!currentPrice || Math.abs(toY(currentPrice) - y) > 14) ctx.fillText(price.toFixed(2), chartW + 5, y + 4);
    }

    // Header
    ctx.fillStyle = "rgba(0,229,255,0.5)"; ctx.font = "10px 'Share Tech Mono', monospace"; ctx.textAlign = "left";
    ctx.fillText(`${asset.replace("_", "")} ${timeframe}`, 8, 18);
    ctx.fillStyle = alert ? "#FF3B5C" : "rgba(0,229,255,0.6)"; ctx.textAlign = "right";
    const mm = String(Math.floor(timer / 60)).padStart(2, "0");
    const ss = String(timer % 60).padStart(2, "0");
    ctx.fillText(`${mm}:${ss}`, plotW - 6, 18);

    // Scroll indicator — show how far back we've panned
    if (pan > 0) {
      ctx.fillStyle = "rgba(0,229,255,0.4)"; ctx.font = "9px 'Share Tech Mono', monospace"; ctx.textAlign = "right";
      ctx.fillText(`← ${pan} back`, plotW - 6, 28);
    }
  }, [asset, timeframe, timer, alert, buyMarkers, sellMarkers, cycleMarkers]);

  useEffect(() => { draw(); const t = setTimeout(draw, 80); return () => clearTimeout(t); }, [candles, currentPrice, draw]);
  useEffect(() => { window.addEventListener("resize", draw); return () => window.removeEventListener("resize", draw); }, [draw]);

  const onDown = (e) => {
    e.stopPropagation();
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
    e.stopPropagation(); e.preventDefault();
    // Pinch zoom
    if (e.touches?.length === 2) {
      const dist = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
      const delta = dist - lastDist.current;
      // pinch OUT = zoom in (more detail, fewer candles)
      // pinch IN  = zoom out (more candles, less detail)
      scaleRef.current = Math.max(0.25, Math.min(10, scaleRef.current + delta * 0.015));
      lastDist.current = dist;
      draw(); return;
    }
    const p  = e.touches ? e.touches[0] : e;
    const dx = p.clientX - lastPos.current.x;
    const dy = p.clientY - lastPos.current.y;
    lastPos.current = { x: p.clientX, y: p.clientY };
    const total = dataRef.current.candles.length;
    // FIXED: drag RIGHT (dx > 0) → go further back (pan increases)
    //        drag LEFT  (dx < 0) → come forward (pan decreases toward 0)
    panX.current = Math.max(0, Math.min(total - 5, panX.current + Math.round(dx / 3)));
    panY.current += dy;
    draw();
  };

  const onUp = (e) => { e.stopPropagation(); isDragging.current = false; };

  const lastTap = useRef(0);
  const onTap = (e) => {
    e.stopPropagation();
    const now = Date.now();
    if (now - lastTap.current < 300) {
      panX.current = 0; panY.current = 0; scaleRef.current = 1; draw();
    }
    lastTap.current = now;
  };

  return (
    <div
      ref={wrapRef}
      style={{
        flex: flex ? 1 : "none",
        height: flex ? undefined : "220px",
        position: "relative", overflow: "hidden",
        touchAction: "none", cursor: "crosshair",
        minHeight: flex ? "150px" : "220px",
      }}
      onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
      onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
      onClick={onTap}
    >
      <canvas ref={canvasRef} style={{ display: "block", position: "absolute", top: 0, left: 0 }} />
    </div>
  );
}
