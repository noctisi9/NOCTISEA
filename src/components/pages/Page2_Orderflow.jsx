import { useRef, useEffect, useCallback } from "react";
import { useApp } from "../../context/AppContext";

export default function Page2_Orderflow() {
  const { state } = useApp();
  const canvasRef = useRef(null);
  const dataRef   = useRef({ candles:[], currentPrice:0, profile:[], poc:0 });
  dataRef.current = { candles: state.candles, currentPrice: state.currentPrice, profile: state.orderflow.profile, poc: state.orderflow.pocLevel };

  const draw = useCallback(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    const DPR = window.devicePixelRatio || 1;
    const W   = cv.offsetWidth || cv.parentElement?.clientWidth || 360;
    const H   = cv.offsetHeight || 280;
    cv.width  = W * DPR; cv.height = H * DPR;
    cv.style.width = W+"px"; cv.style.height = H+"px";
    ctx.scale(DPR, DPR);

    const { candles, currentPrice, profile, poc } = dataRef.current;
    ctx.fillStyle = "#0A0D12"; ctx.fillRect(0,0,W,H);
    if (!candles.length) return;

    const PROF_W  = 80;
    const PRICE_W = 72;
    const chartW  = W - PROF_W - PRICE_W;
    const PAD_T   = 24; const PAD_B = 6;
    const chartH  = H - PAD_T - PAD_B;

    const slice  = candles.slice(-50);
    const highs  = slice.map(c => parseFloat(c.high));
    const lows   = slice.map(c => parseFloat(c.low));
    let maxP = Math.max(...highs, currentPrice||0);
    let minP = Math.min(...lows, currentPrice||99999);
    const pad = (maxP-minP)*0.1||1;
    maxP+=pad; minP-=pad;
    const range = maxP-minP||1;
    const toY = p => PAD_T + chartH - ((parseFloat(p)-minP)/range)*chartH;

    // Grid
    ctx.strokeStyle = "rgba(0,229,255,0.04)"; ctx.lineWidth=1; ctx.setLineDash([3,6]);
    for(let i=0;i<=4;i++){const y=PAD_T+(chartH/4)*i; ctx.beginPath(); ctx.moveTo(PROF_W,y); ctx.lineTo(PROF_W+chartW,y); ctx.stroke();}
    ctx.setLineDash([]);

    // Volume profile - LEFT side (horizontal bars)
    if(profile.length){
      const maxV = Math.max(...profile.map(n=>n.volume),1);
      profile.forEach(node=>{
        const y = toY(node.price);
        if(y<PAD_T||y>PAD_T+chartH) return;
        const barLen = (node.volume/maxV)*(PROF_W-4);
        const isPoc  = Math.abs(node.price-poc)<0.05;
        ctx.fillStyle = isPoc ? "rgba(255,214,0,0.7)" : node.delta>0 ? "rgba(0,255,136,0.3)" : "rgba(255,59,92,0.3)";
        ctx.fillRect(2, y-1.5, barLen, 3);
      });
      // POC horizontal line
      if(poc){
        const pocY = toY(poc);
        ctx.strokeStyle="rgba(255,214,0,0.5)"; ctx.lineWidth=1; ctx.setLineDash([4,4]);
        ctx.beginPath(); ctx.moveTo(PROF_W,pocY); ctx.lineTo(PROF_W+chartW,pocY); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle="#FFD600"; ctx.font="8px 'Share Tech Mono',monospace"; ctx.textAlign="left";
        ctx.fillText("POC",PROF_W+2,pocY-2);
      }
    }

    // Candles
    const barGap = chartW/Math.max(slice.length,1);
    const barW   = Math.max(1.5,barGap*0.65);
    slice.forEach((c,i)=>{
      const x=PROF_W+i*barGap+barGap/2;
      const open=parseFloat(c.open), close=parseFloat(c.close);
      const bull=close>=open; const color=bull?"#D4AF37":"#2979FF";
      ctx.strokeStyle=color; ctx.lineWidth=1;
      ctx.beginPath(); ctx.moveTo(x,toY(parseFloat(c.high))); ctx.lineTo(x,toY(parseFloat(c.low))); ctx.stroke();
      const bTop=toY(Math.max(open,close)); const bH=Math.max(1,toY(Math.min(open,close))-bTop);
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
    // Profile separator
    ctx.strokeStyle="rgba(0,229,255,0.07)"; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(PROF_W,0); ctx.lineTo(PROF_W,H); ctx.stroke();
  }, []);

  useEffect(()=>{ draw(); const t=setTimeout(draw,80); return ()=>clearTimeout(t); },[state.candles,state.currentPrice,state.orderflow.profile]);
  useEffect(()=>{ window.addEventListener("resize",draw); return ()=>window.removeEventListener("resize",draw); },[]);

  const of  = state.orderflow;
  const dir = state.signals.direction;
  const cvd = of.cumulativeDelta || 0;

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      {/* Chart with volume profile */}
      <div style={{ flex:1, position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:"6px", left:"6px", zIndex:5, fontFamily:"'Share Tech Mono',monospace", fontSize:"10px", color:"rgba(0,229,255,0.5)", letterSpacing:".1em" }}>
          {state.activeAsset.replace("_","")} {state.activeTf} · ORDERFLOW
        </div>
        <canvas ref={canvasRef} style={{ display:"block", width:"100%", height:"100%" }} />
      </div>

      {/* Stats row */}
      <div style={{ flexShrink:0, display:"flex", background:"#0D1117", borderTop:"1px solid rgba(0,229,255,0.1)", padding:"8px 0" }}>
        {[
          { l:"CVD", v: (cvd>=0?"+":"")+cvd, c: cvd>=0?"#00FF88":"#FF3B5C" },
          { l:"POC", v: (of.pocLevel||0).toFixed(2), c:"#FFD600" },
          { l:"ABSORPTION", v: of.absorptionDetected?"DETECTED":"CLEAR", c: of.absorptionDetected?"#FF3B5C":"#00FF88" },
        ].map((s,i)=>(
          <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:"2px", borderRight: i<2?"1px solid rgba(0,229,255,0.08)":"none" }}>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"9px", color:"#3A4A55", letterSpacing:".12em" }}>{s.l}</span>
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"12px", fontWeight:700, color:s.c }}>{s.v}</span>
          </div>
        ))}
      </div>

      {/* Signal bar */}
      <div style={{ flexShrink:0, padding:"12px 16px", background: dir==="BUY"?"rgba(0,255,136,0.08)":dir==="SELL"?"rgba(255,59,92,0.08)":"rgba(10,13,18,0.98)", borderTop:`1px solid ${dir==="BUY"?"rgba(0,255,136,0.35)":dir==="SELL"?"rgba(255,59,92,0.35)":"rgba(0,229,255,0.1)"}`, display:"flex", alignItems:"center", justifyContent:"center", gap:"12px" }}>
        <span style={{ fontSize:"20px" }}>{dir==="BUY"?"▲":dir==="SELL"?"▼":"◈"}</span>
        <span style={{ fontFamily:"'Orbitron',monospace", fontSize:"20px", fontWeight:900, letterSpacing:".25em", color:dir==="BUY"?"#00FF88":dir==="SELL"?"#FF3B5C":"#607080" }}>{dir||"SCANNING"}</span>
      </div>
    </div>
  );
}
