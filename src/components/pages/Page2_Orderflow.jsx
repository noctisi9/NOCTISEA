import { useRef, useEffect, useCallback, useState } from "react";
import { PageArrows } from "./Page1_Indicators";
import { useApp } from "../../context/AppContext";

function getStrengthLabel(ratio) {
  if (ratio >= 0.7) return "STRONG";
  if (ratio >= 0.4) return "MEDIUM";
  return "WEAK";
}

export default function Page2_Orderflow({ onNext, onPrev }) {
  const { state } = useApp();
  const canvasRef = useRef(null);
  const dataRef   = useRef({ profile: [], poc: 0, currentPrice: 0, cumulativeDelta: 0 });
  dataRef.current = {
    profile: state.orderflow.profile,
    poc: state.orderflow.pocLevel,
    currentPrice: state.currentPrice,
    cumulativeDelta: state.orderflow.cumulativeDelta,
  };

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const DPR = window.devicePixelRatio || 1;
    const W   = cv.offsetWidth  || cv.parentElement?.clientWidth  || 340;
    const H   = cv.offsetHeight || cv.parentElement?.clientHeight || 420;
    cv.width  = W * DPR; cv.height = H * DPR;
    cv.style.width = W + "px"; cv.style.height = H + "px";
    ctx.scale(DPR, DPR);

    const { profile, poc, currentPrice } = dataRef.current;
    ctx.fillStyle = "#0A0D12";
    ctx.fillRect(0, 0, W, H);

    if (!profile.length) {
      ctx.fillStyle = "rgba(0,229,255,0.25)";
      ctx.font = "11px 'Share Tech Mono',monospace";
      ctx.textAlign = "center";
      ctx.fillText("AWAITING ORDERFLOW DATA...", W / 2, H / 2);
      return;
    }

    // Layout constants
    const BAR_W     = W * 0.50;  // max bar length (left side)
    const PRICE_COL = W * 0.52;  // price label column
    const LABEL_COL = W * 0.78;  // strength label column
    const PAD_T     = 30;
    const PAD_B     = 10;
    const CHART_H   = H - PAD_T - PAD_B;

    // Price range
    const prices = profile.map(n => n.price);
    const maxPrice = Math.max(...prices, currentPrice || 0);
    const minPrice = Math.min(...prices, currentPrice || 99999);
    const range = (maxPrice - minPrice) || 1;

    const maxVol = Math.max(...profile.map(n => n.volume), 1);

    const toY = p => PAD_T + CHART_H - ((parseFloat(p) - minPrice) / range) * CHART_H;

    // Draw bars top → bottom
    const BAR_HEIGHT = Math.max(2, Math.min(14, CHART_H / Math.max(profile.length, 1) * 0.85));

    profile.forEach(node => {
      const y    = toY(node.price);
      if (y < PAD_T - 5 || y > H - PAD_B + 5) return;

      const barLen     = (node.volume / maxVol) * BAR_W;
      const isPoC      = poc && Math.abs(node.price - poc) < 0.05;
      const isBuy      = node.delta > 0;
      const isCurrent  = currentPrice && Math.abs(node.price - currentPrice) < (range * 0.01);
      const volRatio   = node.volume / maxVol;
      const strength   = getStrengthLabel(volRatio);

      // ── BAR (from right edge of bar area → left) ──
      const barX = BAR_W - barLen; // right-aligned within bar area

      if (isPoC) {
        // POC — gold highlight
        const pocGrad = ctx.createLinearGradient(barX, 0, BAR_W, 0);
        pocGrad.addColorStop(0, "rgba(255,214,0,0.1)");
        pocGrad.addColorStop(1, "rgba(255,214,0,0.7)");
        ctx.fillStyle = pocGrad;
        ctx.fillRect(barX, y - BAR_HEIGHT / 2, barLen, BAR_HEIGHT);
        ctx.strokeStyle = "#FFD600"; ctx.lineWidth = 0.5;
        ctx.strokeRect(barX, y - BAR_HEIGHT / 2, barLen, BAR_HEIGHT);
      } else if (isBuy) {
        // Buy (upward tick) — gold
        const buyGrad = ctx.createLinearGradient(barX, 0, BAR_W, 0);
        buyGrad.addColorStop(0, "rgba(212,175,55,0.05)");
        buyGrad.addColorStop(1, `rgba(212,175,55,${0.35 + volRatio * 0.5})`);
        ctx.fillStyle = buyGrad;
        ctx.fillRect(barX, y - BAR_HEIGHT / 2, barLen, BAR_HEIGHT);
      } else {
        // Sell (downward tick) — blue
        const sellGrad = ctx.createLinearGradient(barX, 0, BAR_W, 0);
        sellGrad.addColorStop(0, "rgba(41,121,255,0.05)");
        sellGrad.addColorStop(1, `rgba(41,121,255,${0.35 + volRatio * 0.5})`);
        ctx.fillStyle = sellGrad;
        ctx.fillRect(barX, y - BAR_HEIGHT / 2, barLen, BAR_HEIGHT);
      }

      // Current price highlight
      if (isCurrent) {
        ctx.strokeStyle = "rgba(0,229,255,0.7)"; ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        ctx.setLineDash([]);
      }

      // ── PRICE LABEL ──
      ctx.fillStyle = isPoC ? "#FFD600" : isCurrent ? "#00E5FF" : "#607080";
      ctx.font = isPoC ? "bold 9px 'Share Tech Mono',monospace" : "9px 'Share Tech Mono',monospace";
      ctx.textAlign = "left";
      ctx.fillText(node.price.toFixed(2), PRICE_COL, y + 3);

      // ── STRENGTH TIER ──
      if (strength === "STRONG") {
        ctx.fillStyle = isBuy ? "rgba(212,175,55,0.8)" : "rgba(41,121,255,0.8)";
        ctx.font = "8px 'Share Tech Mono',monospace";
        ctx.textAlign = "left";
        ctx.fillText("STRONG", LABEL_COL, y + 3);
      } else if (strength === "MEDIUM") {
        ctx.fillStyle = "rgba(96,112,128,0.6)";
        ctx.font = "8px 'Share Tech Mono',monospace";
        ctx.textAlign = "left";
        ctx.fillText("MED", LABEL_COL, y + 3);
      }

      // POC label
      if (isPoC) {
        ctx.fillStyle = "#FFD600";
        ctx.font = "bold 8px 'Share Tech Mono',monospace";
        ctx.textAlign = "right";
        ctx.fillText("POC", BAR_W - 3, y + 3);
      }
    });

    // Vertical divider between bar area and labels
    ctx.strokeStyle = "rgba(0,229,255,0.06)"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(BAR_W + 1, PAD_T); ctx.lineTo(BAR_W + 1, H - PAD_B); ctx.stroke();

    // Header
    ctx.fillStyle = "rgba(0,229,255,0.4)";
    ctx.font = "9px 'Share Tech Mono',monospace";
    ctx.textAlign = "left";
    ctx.fillText("VOLUME", 4, 20);
    ctx.fillText("PRICE", PRICE_COL, 20);
    ctx.fillText("TIER", LABEL_COL, 20);

    // Legend
    const legY = H - 6;
    ctx.fillStyle = "rgba(212,175,55,0.7)";
    ctx.fillRect(4, legY - 5, 16, 5);
    ctx.fillStyle = "#8A9AAA"; ctx.font = "8px 'Share Tech Mono',monospace"; ctx.textAlign = "left";
    ctx.fillText("BUY", 23, legY);
    ctx.fillStyle = "rgba(41,121,255,0.7)";
    ctx.fillRect(60, legY - 5, 16, 5);
    ctx.fillStyle = "#8A9AAA";
    ctx.fillText("SELL", 79, legY);
    ctx.fillStyle = "rgba(255,214,0,0.7)";
    ctx.fillRect(115, legY - 5, 16, 5);
    ctx.fillStyle = "#8A9AAA";
    ctx.fillText("POC", 134, legY);
  }, []);

  useEffect(() => {
    draw();
    const t = setInterval(draw, 500);
    window.addEventListener("resize", draw);
    return () => { clearInterval(t); window.removeEventListener("resize", draw); };
  }, [draw]);

  const { orderflow, currentPrice, activeAsset } = state;
  const delta   = orderflow.cumulativeDelta || 0;
  const totalVol = orderflow.totalVolume || 0;
  const isBoomBull = activeAsset === "BOOM_1000" && delta < 0;  // boom sells = downtrend = sell pressure building
  const phaseLabel = Math.abs(delta) > totalVol * 0.6 ? "HOT — HIGH IMBALANCE" : Math.abs(delta) > totalVol * 0.3 ? "NORMAL" : "COOL — BALANCED";
  const phaseColor = phaseLabel.startsWith("HOT") ? "#FFD600" : phaseLabel === "NORMAL" ? "#00FF88" : "#2979FF";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#0A0D12" }}>
      {/* Page navigation arrows */}
      <PageArrows onNext={onNext} onPrev={onPrev} pageIndex={2} totalPages={6} />


      {/* Header */}
      <div style={{ padding: "8px 14px 6px", flexShrink: 0, borderBottom: "1px solid rgba(0,229,255,0.08)" }}>
        <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "13px", color: "#00E5FF", letterSpacing: ".15em" }}>
          ORDERFLOW / VOLUME
        </div>
        <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#607080", marginTop: "2px" }}>
          PRICE LEVEL VOLUME PROFILE · BUY vs SELL PRESSURE
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", padding: "6px 12px", gap: "8px", flexShrink: 0, borderBottom: "1px solid rgba(0,229,255,0.06)" }}>
        {[
          { label: "CUM DELTA", value: delta >= 0 ? `+${delta}` : `${delta}`, color: delta >= 0 ? "#D4AF37" : "#2979FF" },
          { label: "TOTAL VOL", value: totalVol, color: "#8A9AAA" },
          { label: "PHASE", value: phaseLabel.split(" ")[0], color: phaseColor },
          { label: "POC", value: orderflow.pocLevel ? orderflow.pocLevel.toFixed(2) : "—", color: "#FFD600" },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, background: "#0D1117", borderRadius: "4px", padding: "6px 6px 4px", border: "1px solid rgba(0,229,255,0.06)" }}>
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#607080", letterSpacing: ".08em", marginBottom: "2px" }}>{s.label}</div>
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "10px", fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Market phase bar */}
      <div style={{ margin: "6px 12px 4px", padding: "6px 10px", background: `${phaseColor}11`, border: `1px solid ${phaseColor}33`, borderRadius: "4px", flexShrink: 0, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#607080" }}>MARKET PHASE</span>
        <span style={{ fontFamily: "'Orbitron',monospace", fontSize: "11px", fontWeight: 700, color: phaseColor }}>{phaseLabel}</span>
      </div>

      {/* Volume Profile Canvas */}
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        <canvas
          ref={canvasRef}
          style={{ display: "block", width: "100%", height: "100%", position: "absolute", inset: 0 }}
        />
      </div>
    </div>
  );
}
