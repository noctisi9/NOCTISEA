import { useRef, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";

export default function Page3_TickEngine() {
  const { state } = useApp();
  const canvasRef = useRef(null);
  const dataRef   = useRef({ candles:[], current:null, price:0 });
  dataRef.current = { candles: state.secondCandles, current: state.currentSecCandle, price: state.currentPrice };

  const draw = useCallback(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    const DPR = window.devicePixelRatio || 1;
    const W   = cv.offsetWidth || cv.parentElement?.clientWidth || 360;
    const H   = cv.offsetHeight || 200;
    cv.width  = W*DPR; cv.height = H*DPR;
    cv.style.width = W+"px"; cv.style.height = H+"px";
    ctx.scale(DPR, DPR);
    ctx.fillStyle = "#0A0D12"; ctx.fillRect(0,0,W,H);

    const { candles, current, price } = dataRef.current;
    const all = current ? [...candles, current] : candles;
    if (all.length < 2) {
      ctx.fillStyle = "rgba(0,229,255,0.2)"; ctx.font = "11px 'Share Tech Mono',monospace"; ctx.textAlign="center";
      ctx.fillText("WAITING FOR 1-SECOND CANDLE DATA...", W/2, H/2);
      return;
    }

    const AXIS_W  = 60;
    const FUTURE_W = 30;
    const chartW  = W - AXIS_W - FUTURE_W;
    const PAD_T=20; const PAD_B=18; const chartH=H-PAD_T-PAD_B;

    const slice = all.slice(-60);
    const highs = slice.map(c=>c.high);
    const lows  = slice.map(c=>c.low);
    let maxP = Math.max(...highs, price||0);
    let minP = Math.min(...lows, price||99999);
    const pad=(maxP-minP)*0.15||0.5; maxP+=pad; minP-=pad;
    const range=maxP-minP||1;
    const toY = p => PAD_T+chartH-((p-minP)/range)*chartH;

    // Future zone
    ctx.fillStyle="rgba(0,229,255,0.015)";
    ctx.fillRect(chartW,PAD_T,FUTURE_W,chartH);
    ctx.strokeStyle="rgba(0,229,255,0.1)"; ctx.lineWidth=1; ctx.setLineDash([2,4]);
    ctx.beginPath(); ctx.moveTo(chartW,PAD_T); ctx.lineTo(chartW,PAD_T+chartH); ctx.stroke();
    ctx.setLineDash([]);

    // Grid
    ctx.strokeStyle="rgba(0,229,255,0.04)"; ctx.lineWidth=1; ctx.setLineDash([2,5]);
    for(let i=0;i<=4;i++){const y=PAD_T+(chartH/4)*i; ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(chartW,y); ctx.stroke();}
    ctx.setLineDash([]);

    // Candles
    const barGap = chartW/Math.max(slice.length,1);
    const barW   = Math.max(2, barGap*0.7);

    slice.forEach((c,i) => {
      const x     = i*barGap+barGap/2;
      const bull  = c.close >= c.open;
      const isSpk = c.isSpike;

      // Spike candles = bright gold glow
      if (isSpk) {
        ctx.shadowColor = "#FFD600"; ctx.shadowBlur = 8;
        ctx.strokeStyle = "#FFD600"; ctx.lineWidth = 1.5;
      } else {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = bull ? "#C9A84C" : "#2979FF"; ctx.lineWidth = 1;
      }

      // Wick
      ctx.beginPath(); ctx.moveTo(x,toY(c.high)); ctx.lineTo(x,toY(c.low)); ctx.stroke();

      // Body
      const bTop=toY(Math.max(c.open,c.close));
      const bH=Math.max(2,toY(Math.min(c.open,c.close))-bTop);
      ctx.fillStyle = isSpk ? "#FFD600" : bull ? "#C9A84C" : "#2979FF";
      ctx.fillRect(x-barW/2,bTop,barW,bH);

      ctx.shadowBlur=0;

      // Spike marker — circle above candle
      if (isSpk) {
        ctx.beginPath();
        ctx.arc(x, toY(c.high)-7, 3.5, 0, Math.PI*2);
        ctx.fillStyle = "#FFD600"; ctx.fill();
      }

      // Tick count bar at bottom
      const maxTicks = Math.max(...slice.map(s=>s.tickCount||1));
      const th = Math.max(1, ((c.tickCount||1)/maxTicks)*6);
      ctx.fillStyle = isSpk ? "rgba(255,214,0,0.5)" : bull ? "rgba(201,168,76,0.3)" : "rgba(41,121,255,0.3)";
      ctx.fillRect(x-barW/2, PAD_T+chartH+2, barW, th);
    });

    // Price line
    if (price) {
      const py=toY(price);
      ctx.strokeStyle="rgba(0,229,255,0.4)"; ctx.lineWidth=1; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(0,py); ctx.lineTo(chartW,py); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle="#00E5FF"; ctx.fillRect(chartW+FUTURE_W+1,py-9,AXIS_W-2,18);
      ctx.fillStyle="#0A0D12"; ctx.font="bold 9px 'Share Tech Mono',monospace"; ctx.textAlign="left";
      ctx.fillText(parseFloat(price).toFixed(2),chartW+FUTURE_W+4,py+4);
    }

    // Price axis
    ctx.strokeStyle="rgba(0,229,255,0.06)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(chartW+FUTURE_W,0); ctx.lineTo(chartW+FUTURE_W,H); ctx.stroke();
    ctx.fillStyle="#607080"; ctx.font="9px 'Share Tech Mono',monospace"; ctx.textAlign="left";
    for(let i=0;i<=4;i++){
      const pv=minP+(range/4)*(4-i); const y=PAD_T+(chartH/4)*i;
      if(!price||Math.abs(toY(price)-y)>12) ctx.fillText(pv.toFixed(2),chartW+FUTURE_W+4,y+3);
    }

    // Header
    ctx.fillStyle="rgba(0,229,255,0.45)"; ctx.font="10px 'Share Tech Mono',monospace"; ctx.textAlign="left";
    ctx.fillText("1-SEC CANDLES · TICK VOLUME", 6, 14);
  }, []);

  useEffect(()=>{ draw(); const t=setTimeout(draw,80); return()=>clearTimeout(t); },[state.secondCandles, state.currentSecCandle, state.currentPrice, draw]);
  useEffect(()=>{ window.addEventListener("resize",draw); return()=>window.removeEventListener("resize",draw); },[draw]);

  const ts    = state.tickStats;
  const wf    = state.welford;
  const dir   = state.signals.direction;
  const isSpike = state.signals.spikeWarning;
  const phase = state.signals.phase || "NORMAL";
  const lvd   = (state.signals.lvd || 0).toFixed(3);
  const recentSpikes = state.signals.recentSpikes || 0;
  const comprPct = wf.stdDev && wf.sigmaMean ? Math.max(0,Math.round((1-(wf.stdDev/(wf.sigmaMean||1)))*100)) : 0;

  const phaseColor = phase==="HOT" ? "#C9A84C" : phase==="COOL" ? "#2979FF" : "#607080";
  const phaseBg    = phase==="HOT" ? "rgba(201,168,76,0.08)" : phase==="COOL" ? "rgba(41,121,255,0.08)" : "transparent";

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {/* 1-second candle chart */}
      <div style={{ flex:1, position:"relative", minHeight:"160px", overflow:"hidden" }}>
        <canvas ref={canvasRef} style={{ display:"block", width:"100%", height:"100%" }} />
      </div>

      {/* Hz + compression row */}
      <div style={{ flexShrink:0, display:"flex", background:"#0D1117", borderTop:"1px solid rgba(0,229,255,0.08)", padding:"6px 0" }}>
        {[
          { l:"HZ", v:ts.hz||0, c:(ts.hz||0)<8?"#FF3B5C":(ts.hz||0)<=18?"#00E5FF":"#FFD600" },
          { l:"σ COMPR", v:comprPct+"%", c:comprPct>50?"#FF3B5C":comprPct>30?"#FFD600":"#00E5FF" },
          { l:"LVD", v:lvd, c:parseFloat(lvd)>1.5?"#FF3B5C":parseFloat(lvd)>0.8?"#FFD600":"#607080" },
          { l:"SPIKES/10", v:recentSpikes, c:recentSpikes>=3?"#C9A84C":recentSpikes>=1?"#FFD600":"#607080" },
        ].map((s,i)=>(
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"1px", borderRight:i<3?"1px solid rgba(0,229,255,0.06)":"none" }}>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"8px", color:"#3A4A55", letterSpacing:".1em" }}>{s.l}</span>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"13px", fontWeight:700, color:s.c }}>{s.v}</span>
          </div>
        ))}
      </div>

      {/* Bull/bear bar */}
      <div style={{ flexShrink:0, margin:"0 12px 4px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"3px" }}>
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"10px", color:"#C9A84C" }}>▲ {ts.bullPct||50}%</span>
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"10px", color:"#2979FF" }}>{ts.bearPct||50}% ▼</span>
        </div>
        <div style={{ display:"flex", height:"6px", borderRadius:"3px", overflow:"hidden", background:"#0A0D12" }}>
          <div style={{ width:`${ts.bullPct||50}%`, background:"#C9A84C", transition:"width .5s ease" }} />
          <div style={{ width:`${100-(ts.bullPct||50)}%`, background:"#2979FF", transition:"width .5s ease" }} />
        </div>
      </div>

      {/* Phase row */}
      <div style={{ flexShrink:0, padding:"4px 12px", background:phaseBg, borderTop:"1px solid rgba(0,229,255,0.05)", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px" }}>
        <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"9px", color:"rgba(255,255,255,0.2)", letterSpacing:".15em" }}>CYCLE PHASE</span>
        <span style={{ fontFamily:"'Orbitron',monospace", fontSize:"13px", fontWeight:700, letterSpacing:".2em", color:phaseColor }}>{phase}</span>
        {phase==="HOT" && <span style={{ fontSize:"11px" }}>🔥</span>}
        {phase==="COOL" && <span style={{ fontSize:"11px" }}>❄️</span>}
      </div>

      {/* Signal button */}
      <div style={{
        flexShrink:0, padding:"11px 16px",
        background: isSpike?"rgba(255,214,0,0.1)":dir==="BUY"?"rgba(201,168,76,0.1)":dir==="SELL"?"rgba(41,121,255,0.1)":"rgba(10,13,18,0.98)",
        borderTop:`1px solid ${isSpike?"rgba(255,214,0,0.4)":dir==="BUY"?"rgba(201,168,76,0.4)":dir==="SELL"?"rgba(41,121,255,0.4)":"rgba(201,168,76,0.1)"}`,
        display:"flex", alignItems:"center", justifyContent:"center", gap:"14px",
      }}>
        <span style={{ fontSize:"20px" }}>{isSpike?"⚡":dir==="BUY"?"▲":dir==="SELL"?"▼":"◈"}</span>
        <span style={{ fontFamily:"'Orbitron',monospace", fontSize:"20px", fontWeight:900, letterSpacing:".3em",
          color:isSpike?"#FFD600":dir==="BUY"?"#C9A84C":dir==="SELL"?"#2979FF":"#607080" }}>
          {isSpike?"SPIKE WARNING":dir||"SCANNING"}
        </span>
      </div>
    </div>
  );
}
