import { useApp } from "../../context/AppContext";

export default function Page3_TickEngine() {
  const { state } = useApp();
  const ts  = state.tickStats;
  const wf  = state.welford;
  const dir = state.signals.direction;
  const total = (ts.bullTicks||0)+(ts.bearTicks||0);
  const bullW = total>0?(ts.bullTicks/total*100):50;
  const tickSig = state.signals.tickSignal;
  const isSpike = state.signals.spikeWarning;
  const comprPct = wf.stdDev && wf.sigmaMean ? Math.max(0,Math.round((1-(wf.stdDev/(wf.sigmaMean||1)))*100)) : 0;

  const row = (l,v,c="#E0EAF4") => (
    <div style={{ display:"flex", justifyContent:"space-between", padding:"9px 16px", borderBottom:"1px solid rgba(0,229,255,0.05)" }}>
      <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"11px", color:"#607080", letterSpacing:".1em" }}>{l}</span>
      <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"12px", fontWeight:700, color:c }}>{v}</span>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div style={{ padding:"12px 16px 6px" }}>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:"15px", color:"#00E5FF", letterSpacing:".15em" }}>TICK ENGINE</div>
        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"10px", color:"#607080", marginTop:"2px" }}>WELFORD STATISTICAL ENGINE</div>
      </div>

      {/* Hz big display */}
      <div style={{ margin:"8px 12px", background:"#111820", border:"1px solid rgba(0,229,255,0.1)", borderRadius:"4px", padding:"16px", display:"flex", flexDirection:"column", alignItems:"center" }}>
        <span style={{ fontFamily:"'Orbitron',monospace", fontSize:"52px", fontWeight:900, color: isSpike?"#FFD600":(ts.hz||0)<8?"#FF3B5C":"#00E5FF", textShadow:`0 0 20px ${isSpike?"rgba(255,214,0,0.5)":"rgba(0,229,255,0.3)"}`, lineHeight:1 }}>{ts.hz||0}</span>
        <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"11px", color:"#607080", letterSpacing:".2em", marginTop:"4px" }}>TICKS / SEC</span>
        <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"10px", color:(ts.hz||0)<8?"#FF3B5C":(ts.hz||0)<=18?"#00FF88":"#FFD600", marginTop:"4px" }}>
          {(ts.hz||0)<8?"LOW — COMPRESSION RISK":(ts.hz||0)<=18?"NORMAL 12–18 Hz":"HIGH"}
        </span>
      </div>

      {/* Bull/bear bar */}
      <div style={{ margin:"0 12px 8px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"11px", color:"#00FF88" }}>▲ {ts.bullPct||50}%</span>
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"11px", color:"#FF3B5C" }}>{ts.bearPct||50}% ▼</span>
        </div>
        <div style={{ display:"flex", height:"8px", borderRadius:"4px", overflow:"hidden", background:"#0A0D12" }}>
          <div style={{ width:`${bullW}%`, background:"#00FF88", transition:"width .5s ease" }} />
          <div style={{ width:`${100-bullW}%`, background:"#FF3B5C", transition:"width .5s ease" }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:"3px" }}>
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"10px", color:"#607080" }}>{ts.bullTicks||0} UP</span>
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"10px", color:"#607080" }}>{ts.bearTicks||0} DOWN</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ flex:1, overflow:"auto" }}>
        {row("σ CURRENT",  (wf.stdDev||0).toFixed(4),  wf.compressionWarning?"#FFD600":"#E0EAF4")}
        {row("σ MEAN",     (wf.sigmaMean||0).toFixed(4), "#E0EAF4")}
        {row("COMPRESSION %", comprPct+"%", comprPct>50?"#FF3B5C":comprPct>30?"#FFD600":"#00FF88")}
        {row("AVG VELOCITY", (ts.avgVelocity||0).toFixed(5), "#E0EAF4")}
        {row("COMPRESSION", wf.compressionWarning?"WARNING":"NORMAL", wf.compressionWarning?"#FFD600":"#00FF88")}
        {row("TICK SIGNAL", tickSig||"WAITING", tickSig==="BUY"?"#00FF88":tickSig==="SELL"?"#FF3B5C":tickSig==="SPIKE WARNING"?"#FFD600":"#607080")}
      </div>

      {/* Signal bar */}
      <div style={{ flexShrink:0, padding:"12px 16px", background:isSpike?"rgba(255,214,0,0.1)":dir==="BUY"?"rgba(0,255,136,0.08)":dir==="SELL"?"rgba(255,59,92,0.08)":"rgba(10,13,18,0.98)", borderTop:`1px solid ${isSpike?"rgba(255,214,0,0.4)":dir==="BUY"?"rgba(0,255,136,0.35)":dir==="SELL"?"rgba(255,59,92,0.35)":"rgba(0,229,255,0.1)"}`, display:"flex", alignItems:"center", justifyContent:"center", gap:"12px" }}>
        <span style={{ fontSize:"20px" }}>{isSpike?"⚡":dir==="BUY"?"▲":dir==="SELL"?"▼":"◈"}</span>
        <span style={{ fontFamily:"'Orbitron',monospace", fontSize:"20px", fontWeight:900, letterSpacing:".25em", color:isSpike?"#FFD600":dir==="BUY"?"#00FF88":dir==="SELL"?"#FF3B5C":"#607080" }}>{isSpike?"SPIKE WARNING":dir||"SCANNING"}</span>
      </div>
    </div>
  );
}
