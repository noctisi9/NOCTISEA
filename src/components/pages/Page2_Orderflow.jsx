import { useRef, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";

export default function Page2_Orderflow() {
  const { state } = useApp();
  const canvasRef = useRef(null);
  const dataRef   = useRef({ candles:[], currentPrice:0, profile:[], poc:0 });
  dataRef.current = { candles:state.candles, currentPrice:state.currentPrice, profile:state.orderflow.profile, poc:state.orderflow.pocLevel };

  const draw = useCallback(() => {
    const cv = canvasRef.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    const DPR = window.devicePixelRatio || 1;
    const W   = cv.offsetWidth || cv.parentElement?.clientWidth || 360;
    const H   = cv.offsetHeight || 260;
    cv.width  = W*DPR; cv.height = H*DPR;
    cv.style.width = W+"px"; cv.style.height = H+"px";
    ctx.scale(DPR, DPR);

    const { candles, currentPrice, profile, poc } = dataRef.current;
    ctx.fillStyle = "#0A0D12"; ctx.fillRect(0,0,W,H);
    if (!candles.length) return;

    const PROF_W  = 72;
    const PRICE_W = 68;
    const chartW  = W - PROF_W - PRICE_W;
    const PAD_T=22; const PAD_B=6; const chartH=H-PAD_T-PAD_B;

    const slice = candles.slice(-50);
    const highs = slice.map(c=>parseFloat(c.high));
    const lows  = slice.map(c=>parseFloat(c.low));
    let maxP = Math.max(...highs, currentPrice||0);
    let minP = Math.min(...lows, currentPrice||99999);
    const pad=(maxP-minP)*0.1||1; maxP+=pad; minP-=pad;
    const range=maxP-minP||1;
    const toY = p => PAD_T+chartH-((parseFloat(p)-minP)/range)*chartH;

    // Grid
    ctx.strokeStyle="rgba(0,229,255,0.04)"; ctx.lineWidth=1; ctx.setLineDash([3,6]);
    for(let i=0;i<=4;i++){const y=PAD_T+(chartH/4)*i; ctx.beginPath(); ctx.moveTo(PROF_W,y); ctx.lineTo(PROF_W+chartW,y); ctx.stroke();}
    ctx.setLineDash([]);

    // Volume profile bars — buy=teal, sell=dark red
    if(profile.length){
      const maxV=Math.max(...profile.map(n=>n.volume),1);
      profile.forEach(node=>{
        const y=toY(node.price); if(y<PAD_T||y>PAD_T+chartH) return;
        const isPoc=Math.abs(node.price-poc)<0.05;
        const buyVol = node.delta > 0 ? node.volume : node.volume * 0.35;
        const sellVol = node.delta <= 0 ? node.volume : node.volume * 0.35;
        const buyLen  = (buyVol/maxV)*(PROF_W-4)*0.65;
        const sellLen = (sellVol/maxV)*(PROF_W-4)*0.65;
        // buy bar (teal)
        ctx.fillStyle = isPoc ? "rgba(0,229,255,0.9)" : "rgba(0,196,170,0.6)";
        ctx.fillRect(2, y-1.5, buyLen, 3);
        // sell bar (dark red)
        ctx.fillStyle = isPoc ? "rgba(255,60,60,0.9)" : "rgba(139,26,26,0.65)";
        ctx.fillRect(2+buyLen, y-1.5, sellLen, 3);
      });
      if(poc){
        const pocY=toY(poc);
        ctx.strokeStyle="rgba(255,214,0,0.45)"; ctx.lineWidth=1; ctx.setLineDash([4,4]);
        ctx.beginPath(); ctx.moveTo(PROF_W,pocY); ctx.lineTo(PROF_W+chartW,pocY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle="#FFD600"; ctx.font="8px 'Share Tech Mono',monospace"; ctx.textAlign="left";
        ctx.fillText("POC",PROF_W+2,pocY-3);
      }
    }

    // Candles — gold bull, blue bear (MT5 style)
    const barGap=chartW/Math.max(slice.length,1); const barW=Math.max(2,barGap*0.68);
    slice.forEach((c,i)=>{
      const x=PROF_W+i*barGap+barGap/2;
      const open=parseFloat(c.open),close=parseFloat(c.close);
      const bull=close>=open; const color=bull?"#D4AF37":"#2979FF";
      ctx.strokeStyle=color; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(x,toY(parseFloat(c.high))); ctx.lineTo(x,toY(parseFloat(c.low))); ctx.stroke();
      const bTop=toY(Math.max(open,close)); const bH=Math.max(2,toY(Math.min(open,close))-bTop);
      ctx.fillStyle=color; ctx.fillRect(x-barW/2,bTop,barW,bH);
    });

    // Price line
    if(currentPrice){
      const py=toY(currentPrice);
      ctx.strokeStyle="rgba(0,229,255,0.5)"; ctx.lineWidth=1; ctx.setLineDash([4,4]);
      ctx.beginPath(); ctx.moveTo(PROF_W,py); ctx.lineTo(PROF_W+chartW,py); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle="#00E5FF"; ctx.fillRect(PROF_W+chartW+1,py-10,PRICE_W-2,20);
      ctx.fillStyle="#0A0D12"; ctx.font="bold 10px 'Share Tech Mono',monospace"; ctx.textAlign="left";
      ctx.fillText(parseFloat(currentPrice).toFixed(2),PROF_W+chartW+5,py+4);
    }

    // Price axis
    ctx.strokeStyle="rgba(0,229,255,0.07)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(PROF_W+chartW,0); ctx.lineTo(PROF_W+chartW,H); ctx.stroke();
    ctx.fillStyle="#607080"; ctx.font="10px 'Share Tech Mono',monospace"; ctx.textAlign="left";
    for(let i=0;i<=4;i++){
      const price=minP+(range/4)*(4-i); const y=PAD_T+(chartH/4)*i;
      if(!currentPrice||Math.abs(toY(currentPrice)-y)>14) ctx.fillText(price.toFixed(2),PROF_W+chartW+5,y+4);
    }
    ctx.strokeStyle="rgba(0,229,255,0.07)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(PROF_W,0); ctx.lineTo(PROF_W,H); ctx.stroke();
  }, []);

  useEffect(()=>{ draw(); const t=setTimeout(draw,80); return()=>clearTimeout(t); },[state.candles,state.currentPrice,state.orderflow.profile]);
  useEffect(()=>{ window.addEventListener("resize",draw); return()=>window.removeEventListener("resize",draw); },[]);

  const of  = state.orderflow;
  const dir = state.signals.direction;
  const cvd = of.cumulativeDelta || 0;

  // Derive phase from LVD / spike activity
  const spikeCount   = state.signals.recentSpikes || 0;
  const lvd          = state.signals.lvd || 0;
  const phase        = spikeCount >= 3 ? "HOT" : lvd > 50 ? "COOL" : "NORMAL";
  const phaseColor   = phase==="HOT" ? "#C9A84C" : phase==="COOL" ? "#2979FF" : "#607080";
  const phaseBg      = phase==="HOT" ? "rgba(201,168,76,0.07)" : phase==="COOL" ? "rgba(41,121,255,0.07)" : "transparent";

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>

      {/* Label */}
      <div style={{ position:"absolute", top:"6px", left:"6px", zIndex:5, fontFamily:"'Share Tech Mono',monospace", fontSize:"10px", color:"rgba(0,229,255,0.45)", letterSpacing:".1em" }}>
        {state.activeAsset.replace("_","")} {state.activeTf} · ORDERFLOW
      </div>

      {/* Chart */}
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
        <canvas ref={canvasRef} style={{ display:"block", width:"100%", height:"100%" }} />
      </div>

      {/* Buy / Sell cycle stats */}
      <div style={{ flexShrink:0, display:"flex", background:"#0D1117", borderTop:"1px solid rgba(0,229,255,0.08)", padding:"7px 0" }}>
        {[
          { l:"BUY ORDERS", v: cvd>=0 ? "+"+Math.abs(cvd) : null, sub:"SPIKES", c:"#C9A84C" },
          { l:"SELL ORDERS", v: cvd<0  ? Math.abs(cvd)+"" : null,  sub:"GRIND",  c:"#2979FF" },
          { l:"CVD", v:(cvd>=0?"+":"")+cvd, sub:"DELTA", c:cvd>=0?"#C9A84C":"#2979FF" },
          { l:"POC", v:(of.pocLevel||0).toFixed(2), sub:"LEVEL", c:"#FFD600" },
        ].map((s,i)=>(
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"1px", borderRight:i<3?"1px solid rgba(0,229,255,0.06)":"none" }}>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"8px", color:"#3A4A55", letterSpacing:".1em" }}>{s.l}</span>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"11px", fontWeight:700, color:s.c }}>{s.v || "—"}</span>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"7px", color:"rgba(255,255,255,0.15)" }}>{s.sub}</span>
          </div>
        ))}
      </div>

      {/* Phase indicator */}
      <div style={{ flexShrink:0, padding:"5px 12px", background:phaseBg, borderTop:"1px solid rgba(0,229,255,0.06)", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px" }}>
        <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"9px", color:"rgba(255,255,255,0.2)", letterSpacing:".15em" }}>CYCLE PHASE</span>
        <span style={{ fontFamily:"'Orbitron',monospace", fontSize:"13px", fontWeight:700, letterSpacing:".2em", color:phaseColor }}>{phase}</span>
        {phase==="HOT" && <span style={{ fontSize:"11px" }}>🔥</span>}
        {phase==="COOL" && <span style={{ fontSize:"11px" }}>❄️</span>}
      </div>

      {/* Signal button */}
      <div style={{
        flexShrink:0, padding:"11px 16px",
        background: dir==="BUY"?"rgba(201,168,76,0.1)":dir==="SELL"?"rgba(41,121,255,0.1)":"rgba(10,13,18,0.98)",
        borderTop:`1px solid ${dir==="BUY"?"rgba(201,168,76,0.4)":dir==="SELL"?"rgba(41,121,255,0.4)":"rgba(201,168,76,0.1)"}`,
        display:"flex", alignItems:"center", justifyContent:"center", gap:"14px",
      }}>
        <span style={{ fontSize:"20px" }}>{dir==="BUY"?"▲":dir==="SELL"?"▼":"◈"}</span>
        <span style={{ fontFamily:"'Orbitron',monospace", fontSize:"20px", fontWeight:900, letterSpacing:".3em", color:dir==="BUY"?"#C9A84C":dir==="SELL"?"#2979FF":"#607080" }}>
          {dir||"SCANNING"}
        </span>
      </div>
    </div>
  );
}
