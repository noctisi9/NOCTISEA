import { useRef, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";
import StatusRibbon from "../layout/StatusRibbon";

export default function Page2_Orderflow() {
  const { state } = useApp();
  const chartRef    = useRef(null);
  const profileRef  = useRef(null);
  const candleData  = useRef({ candles: [], currentPrice: 0, profile: [] });

  candleData.current = {
    candles:      state.candles,
    currentPrice: state.currentPrice,
    profile:      state.orderflow.profile,
  };

  const drawChart = useCallback(() => {
    // Candle canvas
    const cc  = chartRef.current;
    if (!cc) return;
    const ctx = cc.getContext("2d");
    const DPR = window.devicePixelRatio || 1;
    const W   = cc.offsetWidth || 300;
    const H   = cc.offsetHeight || 220;
    cc.width  = W * DPR;
    cc.height = H * DPR;
    ctx.scale(DPR, DPR);

    const { candles, currentPrice } = candleData.current;
    ctx.fillStyle = "#0A0D12";
    ctx.fillRect(0, 0, W, H);
    if (!candles.length) return;

    const AXIS_W = 0; // no price axis — profile takes that space
    const PROF_W = 80;
    const chartW = W - PROF_W;
    const PAD    = 24;
    const chartH = H - PAD - 6;

    const slice  = candles.slice(-50);
    const highs  = slice.map(c => parseFloat(c.high));
    const lows   = slice.map(c => parseFloat(c.low));
    let maxP     = Math.max(...highs, currentPrice || 0);
    let minP     = Math.min(...lows,  currentPrice || 99999);
    const pad    = (maxP - minP) * 0.1 || 1;
    maxP += pad; minP -= pad;
    const range  = maxP - minP || 1;
    const toY    = p => PAD + chartH - ((parseFloat(p) - minP) / range) * chartH;

    // Grid
    ctx.strokeStyle = "rgba(0,229,255,0.04)";
    ctx.lineWidth   = 1;
    ctx.setLineDash([3, 6]);
    for (let i = 0; i <= 4; i++) {
      const y = PAD + (chartH / 4) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(chartW, y); ctx.stroke();
    }
    ctx.setLineDash([]);

    // Candles
    const barGap = chartW / slice.length;
    const barW   = Math.max(1.5, barGap * 0.65);
    slice.forEach((c, i) => {
      const x     = i * barGap + barGap / 2;
      const open  = parseFloat(c.open);
      const close = parseFloat(c.close);
      const bull  = close >= open;
      const color = bull ? "#D4AF37" : "#2979FF";
      ctx.strokeStyle = color; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, toY(parseFloat(c.high))); ctx.lineTo(x, toY(parseFloat(c.low))); ctx.stroke();
      const bTop = toY(Math.max(open, close));
      const bH   = Math.max(1, toY(Math.min(open, close)) - bTop);
      ctx.fillStyle = color;
      ctx.fillRect(x - barW / 2, bTop, barW, bH);
    });

    // Current price line
    if (currentPrice) {
      const py = toY(currentPrice);
      ctx.strokeStyle = "rgba(0,229,255,0.5)"; ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(chartW, py); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Volume profile on the right
    const { profile } = candleData.current;
    if (profile.length) {
      const maxVol = Math.max(...profile.map(n => n.volume), 1);
      const pocLevel = state.orderflow.pocLevel;

      profile.forEach(node => {
        const y   = toY(node.price);
        if (y < PAD || y > PAD + chartH) return;
        const barLen = (node.volume / maxVol) * (PROF_W - 4);
        const isPoc  = Math.abs(node.price - pocLevel) < 0.02;

        // Volume bar
        ctx.fillStyle = isPoc
          ? "rgba(255,214,0,0.7)"
          : node.delta > 0
            ? "rgba(0,255,136,0.25)"
            : "rgba(255,59,92,0.25)";
        ctx.fillRect(chartW + 2, y - 1.5, barLen, 3);
      });

      // POC label
      if (pocLevel) {
        const pocY = toY(pocLevel);
        ctx.fillStyle   = "#FFD600";
        ctx.font        = "9px 'Share Tech Mono', monospace";
        ctx.textAlign   = "left";
        ctx.fillText("POC", chartW + 4, pocY - 2);
        ctx.strokeStyle = "rgba(255,214,0,0.4)";
        ctx.lineWidth   = 1;
        ctx.setLineDash([3, 4]);
        ctx.beginPath(); ctx.moveTo(0, pocY); ctx.lineTo(chartW, pocY); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }, []);

  useEffect(() => {
    drawChart();
  }, [state.candles, state.currentPrice, state.orderflow.profile]);

  const of  = state.orderflow;
  const dir = state.signals.direction;

  return (
    <div className="page-container">
      <div className="chart-wrap" style={{ position: "relative" }}>
        <div className="chart-header">
          <span className="chart-label">{state.activeAsset.replace("_","")} {state.activeTf} · ORDERFLOW</span>
          <span className="chart-label" style={{ color: "#FFD600" }}>POC {of.pocLevel?.toFixed(2)}</span>
        </div>
        <canvas ref={chartRef} className="candle-canvas" />
      </div>

      {/* Orderflow stats */}
      <div className="of-stats">
        <div className="of-stat">
          <span className="of-lbl">CUM DELTA</span>
          <span className={`of-val ${of.cumulativeDelta >= 0 ? "pos" : "neg"}`}>
            {of.cumulativeDelta >= 0 ? "+" : ""}{of.cumulativeDelta}
          </span>
        </div>
        <div className="of-div" />
        <div className="of-stat">
          <span className="of-lbl">VOLUME</span>
          <span className="of-val">{of.totalVolume || 0}</span>
        </div>
        <div className="of-div" />
        <div className="of-stat">
          <span className="of-lbl">ABSORPTION</span>
          <span className={`of-val ${of.absorptionDetected ? "neg" : "pos"}`}>
            {of.absorptionDetected ? "DETECTED" : "CLEAR"}
          </span>
        </div>
      </div>

      <div className="signal-strip">
        <div className={`signal-box ${dir === "BUY" ? "buy" : dir === "SELL" ? "sell" : "neutral"}`}>
          <span className="sig-arrow">{dir === "BUY" ? "▲" : dir === "SELL" ? "▼" : "◈"}</span>
          <span className="sig-word">{dir || "SCANNING"}</span>
        </div>
      </div>
      <StatusRibbon />
    </div>
  );
}
