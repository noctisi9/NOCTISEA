import { useRef, useEffect, useCallback } from "react";
import { PageArrows } from "./Page1_Indicators";
import { useApp } from "../../context/AppContext";

function getStrengthLabel(r) {
  if (r >= 0.7) return "STRONG";
  if (r >= 0.4) return "MED";
  return "";
}

export default function Page2_Orderflow({ onNext, onPrev }) {
  const { state }  = useApp();
  const canvasRef  = useRef(null);

  // Keep all live data in a ref so draw() always sees latest without re-subscribing
  const dataRef = useRef({});
  dataRef.current = {
    candles:      state.candles        || [],
    profile:      state.orderflow.profile || [],
    poc:          state.orderflow.pocLevel || 0,
    currentPrice: state.currentPrice   || 0,
    delta:        state.orderflow.cumulativeDelta || 0,
    totalVol:     state.orderflow.totalVolume || 0,
  };

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const DPR = window.devicePixelRatio || 1;
    const W   = cv.offsetWidth  || cv.parentElement?.clientWidth  || 340;
    const H   = cv.offsetHeight || cv.parentElement?.clientHeight || 400;
    cv.width  = W * DPR; cv.height = H * DPR;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.scale(DPR, DPR);

    const { candles, profile, poc, currentPrice } = dataRef.current;

    // ── BACKGROUND ───────────────────────────────────────────
    ctx.fillStyle = "#0A0D12";
    ctx.fillRect(0, 0, W, H);

    // Layout — candles use right 55% of width, vol profile uses left 40%
    // Price axis on far right
    const AXIS_W     = 56;          // right-side price axis
    const VOL_W      = W * 0.36;    // volume profile bar max width (left side)
    const CANDLE_L   = VOL_W + 4;   // candles start after vol bars
    const CANDLE_W   = W - AXIS_W - CANDLE_L; // candle area width
    const PAD_T      = 24;
    const PAD_B      = 8;
    const CHART_H    = H - PAD_T - PAD_B;

    // ── SHARED PRICE RANGE ────────────────────────────────────
    // Derive from candles + profile combined so both share the same Y scale
    const candlePrices = candles.flatMap(c => [parseFloat(c.high), parseFloat(c.low)]);
    const profPrices   = profile.map(n => n.price);
    const allPrices    = [...candlePrices, ...profPrices, currentPrice].filter(Boolean);

    if (!allPrices.length) {
      ctx.fillStyle = "rgba(0,229,255,0.25)";
      ctx.font = "11px 'Share Tech Mono',monospace";
      ctx.textAlign = "center";
      ctx.fillText("AWAITING DATA...", W / 2, H / 2);
      return;
    }

    let maxP = Math.max(...allPrices);
    let minP = Math.min(...allPrices);
    const rng = (maxP - minP) || 1;
    maxP += rng * 0.06;
    minP -= rng * 0.06;
    const range = (maxP - minP) || 1;

    // Shared coordinate function — same Y for any price on both layers
    const toY = p => PAD_T + CHART_H - ((parseFloat(p) - minP) / range) * CHART_H;

    // ── GRID LINES ────────────────────────────────────────────
    ctx.strokeStyle = "rgba(0,229,255,0.04)";
    ctx.lineWidth = 0.5; ctx.setLineDash([3, 7]);
    for (let i = 0; i <= 6; i++) {
      const y = PAD_T + (CHART_H / 6) * i;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W - AXIS_W, y); ctx.stroke();
    }
    ctx.setLineDash([]);

    // ── LAYER 1: CANDLES (right portion, semi-transparent) ────
    if (candles.length > 0) {
      const SHOW    = Math.min(candles.length, 60);
      const slice   = candles.slice(-SHOW);
      const barGap  = CANDLE_W / Math.max(slice.length, 1);
      const barW    = Math.max(2, barGap * 0.65);

      slice.forEach((c, i) => {
        const x     = CANDLE_L + i * barGap + barGap / 2;
        const open  = parseFloat(c.open);
        const close = parseFloat(c.close);
        const high  = parseFloat(c.high);
        const low   = parseFloat(c.low);
        const bull  = close >= open;

        // Wick
        ctx.strokeStyle = bull ? "rgba(212,175,55,0.55)" : "rgba(41,121,255,0.55)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, toY(high));
        ctx.lineTo(x, toY(low));
        ctx.stroke();

        // Body — slightly transparent so vol profile shows through
        const bTop = toY(Math.max(open, close));
        const bH   = Math.max(1.5, toY(Math.min(open, close)) - bTop);
        ctx.fillStyle = bull ? "rgba(212,175,55,0.65)" : "rgba(41,121,255,0.65)";
        ctx.fillRect(x - barW / 2, bTop, barW, bH);
      });

      // Label candle area
      ctx.fillStyle = "rgba(0,229,255,0.2)";
      ctx.font = "8px 'Share Tech Mono',monospace";
      ctx.textAlign = "left";
      ctx.fillText(`${state.activeAsset?.replace("_","") || ""} M1`, CANDLE_L + 2, PAD_T - 6);
    }

    // ── LAYER 2: VOLUME PROFILE BARS (left portion) ───────────
    if (profile.length > 0) {
      const maxVol    = Math.max(...profile.map(n => n.volume), 1);
      // Row height — distribute evenly across chart height based on price range
      // Each bar is thin, centred on its price level
      const BAR_H = Math.max(2, Math.min(10, CHART_H / Math.max(profile.length, 1) * 0.85));

      profile.forEach(node => {
        const y       = toY(node.price);
        if (y < PAD_T - 4 || y > H - PAD_B + 4) return;

        const volRatio = node.volume / maxVol;
        const barLen   = volRatio * VOL_W;
        const barX     = VOL_W - barLen; // right-aligned so bars grow leftward from centre divider
        const isPoc    = poc && Math.abs(node.price - poc) < (range * 0.005 + 0.01);
        const isBuy    = node.delta > 0;

        if (isPoc) {
          const g = ctx.createLinearGradient(barX, 0, VOL_W, 0);
          g.addColorStop(0, "rgba(255,214,0,0.08)");
          g.addColorStop(1, "rgba(255,214,0,0.75)");
          ctx.fillStyle = g;
          ctx.fillRect(barX, y - BAR_H / 2, barLen, BAR_H);
          ctx.strokeStyle = "rgba(255,214,0,0.6)"; ctx.lineWidth = 0.5;
          ctx.strokeRect(barX, y - BAR_H / 2, barLen, BAR_H);
          // POC horizontal line across full chart width
          ctx.strokeStyle = "rgba(255,214,0,0.18)"; ctx.lineWidth = 1;
          ctx.setLineDash([6, 4]);
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W - AXIS_W, y); ctx.stroke();
          ctx.setLineDash([]);
        } else if (isBuy) {
          const g = ctx.createLinearGradient(barX, 0, VOL_W, 0);
          g.addColorStop(0, "rgba(212,175,55,0.04)");
          g.addColorStop(1, `rgba(212,175,55,${0.3 + volRatio * 0.55})`);
          ctx.fillStyle = g;
          ctx.fillRect(barX, y - BAR_H / 2, barLen, BAR_H);
        } else {
          const g = ctx.createLinearGradient(barX, 0, VOL_W, 0);
          g.addColorStop(0, "rgba(41,121,255,0.04)");
          g.addColorStop(1, `rgba(41,121,255,${0.3 + volRatio * 0.55})`);
          ctx.fillStyle = g;
          ctx.fillRect(barX, y - BAR_H / 2, barLen, BAR_H);
        }

        // Strength label (STRONG only — less clutter)
        const str = getStrengthLabel(volRatio);
        if (str === "STRONG") {
          ctx.fillStyle = isPoc ? "#FFD600" : isBuy ? "rgba(212,175,55,0.75)" : "rgba(41,121,255,0.75)";
          ctx.font = "7px 'Share Tech Mono',monospace";
          ctx.textAlign = "left";
          ctx.fillText("●", 2, y + 2.5);
        }
        if (isPoc) {
          ctx.fillStyle = "#FFD600";
          ctx.font = "bold 7px 'Share Tech Mono',monospace";
          ctx.textAlign = "right";
          ctx.fillText("POC", VOL_W - 2, y + 2.5);
        }
      });
    }

    // ── DIVIDER between vol profile and candles ───────────────
    ctx.strokeStyle = "rgba(0,229,255,0.08)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(VOL_W + 2, PAD_T); ctx.lineTo(VOL_W + 2, H - PAD_B); ctx.stroke();

    // ── CURRENT PRICE LINE ───────────────────────────────────
    if (currentPrice) {
      const py = toY(currentPrice);
      if (py > PAD_T && py < H - PAD_B) {
        ctx.strokeStyle = "rgba(0,229,255,0.6)"; ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(W - AXIS_W, py); ctx.stroke();
        ctx.setLineDash([]);
        // Price badge on axis
        ctx.fillStyle = "#00E5FF";
        ctx.fillRect(W - AXIS_W, py - 9, AXIS_W, 18);
        ctx.fillStyle = "#0A0D12";
        ctx.font = "bold 9px 'Share Tech Mono',monospace";
        ctx.textAlign = "center";
        ctx.fillText(parseFloat(currentPrice).toFixed(2), W - AXIS_W + AXIS_W / 2, py + 3);
      }
    }

    // ── PRICE AXIS (right) ────────────────────────────────────
    ctx.strokeStyle = "rgba(0,229,255,0.06)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(W - AXIS_W, PAD_T); ctx.lineTo(W - AXIS_W, H - PAD_B); ctx.stroke();
    ctx.fillStyle = "#3A4A58"; ctx.font = "9px 'Share Tech Mono',monospace"; ctx.textAlign = "left";
    for (let i = 0; i <= 6; i++) {
      const price = minP + (range / 6) * (6 - i);
      const y     = PAD_T + (CHART_H / 6) * i;
      if (!currentPrice || Math.abs(toY(currentPrice) - y) > 12) {
        ctx.fillText(price.toFixed(2), W - AXIS_W + 3, y + 3);
      }
    }

    // ── COLUMN HEADERS ────────────────────────────────────────
    ctx.fillStyle = "rgba(0,229,255,0.3)";
    ctx.font = "8px 'Share Tech Mono',monospace";
    ctx.textAlign = "left";
    ctx.fillText("VOL PROFILE", 2, 16);
    ctx.textAlign = "right";
    ctx.fillText("CANDLES →", W - AXIS_W - 2, 16);

    // ── LEGEND ────────────────────────────────────────────────
    const legY = H - 3;
    ctx.fillStyle = "rgba(212,175,55,0.7)"; ctx.fillRect(2, legY - 5, 14, 5);
    ctx.fillStyle = "#607080"; ctx.font = "7px 'Share Tech Mono',monospace"; ctx.textAlign = "left";
    ctx.fillText("BUY", 18, legY);
    ctx.fillStyle = "rgba(41,121,255,0.7)"; ctx.fillRect(44, legY - 5, 14, 5);
    ctx.fillText("SELL", 60, legY);
    ctx.fillStyle = "rgba(255,214,0,0.7)"; ctx.fillRect(88, legY - 5, 14, 5);
    ctx.fillText("POC", 104, legY);

  }, [state.activeAsset]);

  // Redraw whenever candles, price, or orderflow update
  useEffect(() => {
    draw();
  }, [state.candles, state.currentPrice, state.orderflow, draw]);

  useEffect(() => {
    const t = setInterval(draw, 400);
    window.addEventListener("resize", draw);
    return () => { clearInterval(t); window.removeEventListener("resize", draw); };
  }, [draw]);

  const { orderflow, currentPrice, activeAsset } = state;
  const delta     = orderflow.cumulativeDelta || 0;
  const totalVol  = orderflow.totalVolume || 0;
  const phaseLabel = Math.abs(delta) > totalVol * 0.6
    ? "HOT — HIGH IMBALANCE"
    : Math.abs(delta) > totalVol * 0.3
    ? "NORMAL"
    : "COOL — BALANCED";
  const phaseColor = phaseLabel.startsWith("HOT") ? "#FFD600"
    : phaseLabel === "NORMAL" ? "#00FF88"
    : "#2979FF";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#0A0D12", position: "relative" }}>

      <PageArrows onNext={onNext} onPrev={onPrev} pageIndex={2} totalPages={6} />

      {/* Header */}
      <div style={{ padding: "8px 14px 5px", flexShrink: 0, borderBottom: "1px solid rgba(0,229,255,0.08)" }}>
        <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "13px", color: "#00E5FF", letterSpacing: ".15em" }}>
          ORDERFLOW / VOLUME
        </div>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#607080", marginTop: "1px" }}>
          VOLUME PROFILE + LIVE CANDLES · SHARED PRICE AXIS
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", padding: "5px 10px", gap: "6px", flexShrink: 0, borderBottom: "1px solid rgba(0,229,255,0.05)" }}>
        {[
          { label: "CUM DELTA", value: delta >= 0 ? `+${delta}` : `${delta}`, color: delta >= 0 ? "#D4AF37" : "#2979FF" },
          { label: "TOTAL VOL", value: totalVol,                               color: "#8A9AAA" },
          { label: "PHASE",     value: phaseLabel.split(" ")[0],               color: phaseColor },
          { label: "POC",       value: orderflow.pocLevel ? orderflow.pocLevel.toFixed(2) : "—", color: "#FFD600" },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, background: "#0D1117", borderRadius: "4px",
            padding: "5px 5px 4px", border: "1px solid rgba(0,229,255,0.05)",
          }}>
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "7px", color: "#607080", marginBottom: "2px" }}>{s.label}</div>
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "10px", fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Phase banner */}
      <div style={{
        margin: "4px 10px 3px", padding: "5px 10px",
        background: `${phaseColor}0F`, border: `1px solid ${phaseColor}2A`,
        borderRadius: "4px", flexShrink: 0,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#607080" }}>MARKET PHASE</span>
        <span style={{ fontFamily: "'Orbitron',monospace", fontSize: "11px", fontWeight: 700, color: phaseColor }}>{phaseLabel}</span>
      </div>

      {/* Main canvas — vol profile + candles overlaid */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", height: "100%", position: "absolute", inset: 0 }}
        />
      </div>
    </div>
  );
}
