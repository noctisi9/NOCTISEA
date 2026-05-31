import { useApp } from "../../context/AppContext";

export default function Page4_Fusion() {
  const { state } = useApp();
  const sig = state.signals;
  const dir  = sig.direction;
  const conf = sig.confidence || 0;
  const isSpike = sig.spikeWarning;

  const engCard = (name, signal, detail) => {
    const c = signal==="BUY"?"#00FF88":signal==="SELL"?"#FF3B5C":signal==="SPIKE WARNING"?"#FFD600":"#607080";
    return (
      <div style={{ background:"#111820", border:`1px solid ${c}44`, borderRadius:"4px", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
        <div>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"10px", color:"#607080", letterSpacing:".12em", marginBottom:"4px" }}>{name}</div>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"11px", color:"#8A9AAA" }}>{detail}</div>
        </div>
        <span style={{ fontFamily:"'Orbitron',monospace", fontSize:"14px", fontWeight:900, color:c, letterSpacing:".15em" }}>{signal||"WAIT"}</span>
      </div>
    );
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div style={{ padding:"12px 16px 6px", flexShrink:0 }}>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:"15px", color:"#00E5FF", letterSpacing:".15em" }}>FUSION CENTER</div>
        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"10px", color:"#607080", marginTop:"2px" }}>ENGINE AGREEMENT LAYER</div>
      </div>

      {/* Master signal */}
      <div style={{ margin:"8px 12px", background: isSpike?"rgba(255,214,0,0.08)":dir==="BUY"?"rgba(0,255,136,0.06)":dir==="SELL"?"rgba(255,59,92,0.06)":"rgba(17,24,32,1)", border:`1px solid ${isSpike?"rgba(255,214,0,0.4)":dir==="BUY"?"rgba(0,255,136,0.35)":dir==="SELL"?"rgba(255,59,92,0.35)":"rgba(0,229,255,0.12)"}`, borderRadius:"6px", padding:"20px 16px", display:"flex", flexDirection:"column", alignItems:"center", gap:"8px", flexShrink:0 }}>
        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"10px", color:"#607080", letterSpacing:".2em" }}>MASTER SIGNAL</div>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:"36px", fontWeight:900, letterSpacing:".25em", color:isSpike?"#FFD600":dir==="BUY"?"#00FF88":dir==="SELL"?"#FF3B5C":"#607080", textShadow:`0 0 24px ${isSpike?"rgba(255,214,0,0.4)":dir==="BUY"?"rgba(0,255,136,0.3)":dir==="SELL"?"rgba(255,59,92,0.3)":"none"}` }}>
          {isSpike?"SPIKE WARNING":dir||"WAIT"}
        </div>
        {conf > 0 && (
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"12px", color:"#8A9AAA" }}>
            Confidence: <span style={{ color: conf>=80?"#00FF88":conf>=60?"#FFD600":"#FF3B5C", fontWeight:700 }}>{conf}%</span>
          </div>
        )}
        <div style={{ width:"100%", height:"1px", background:"rgba(0,229,255,0.08)", margin:"4px 0" }} />
        <div style={{ display:"flex", gap:"20px", fontFamily:"'Share Tech Mono',monospace", fontSize:"11px" }}>
          {[
            { l:"AO/AC", v:sig.e1Signal },
            { l:"ORDERFLOW", v:sig.ofSignal },
            { l:"TICK", v:sig.tickSignal },
          ].map(e=>(
            <div key={e.l} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:"3px" }}>
              <span style={{ color:"#607080", fontSize:"9px", letterSpacing:".1em" }}>{e.l}</span>
              <span style={{ color:e.v==="BUY"?"#00FF88":e.v==="SELL"?"#FF3B5C":e.v==="SPIKE WARNING"?"#FFD600":"#607080", fontWeight:700 }}>{e.v||"WAIT"}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Engine cards */}
      <div style={{ flex:1, overflow:"auto", display:"flex", flexDirection:"column", gap:"8px", padding:"0 12px 8px" }}>
        {engCard("ENGINE 1 · AO/AC", sig.e1Signal, sig.ao>=0&&sig.ac>=0?"Both positive":"Both negative")}
        {engCard("ENGINE 2 · ORDERFLOW", sig.ofSignal, state.orderflow.absorptionDetected?"Absorption detected":"CVD "+(state.orderflow.cumulativeDelta>=0?"positive":"negative"))}
        {engCard("ENGINE 3 · TICK/WELFORD", sig.spikeWarning?"SPIKE WARNING":sig.tickSignal, "Hz "+(state.tickStats.hz||0)+" · σ "+(state.welford.stdDev||0).toFixed(4))}
      </div>

      {/* Logic display */}
      <div style={{ flexShrink:0, margin:"0 12px 8px", background:"#111820", border:"1px solid rgba(0,229,255,0.08)", borderRadius:"4px", padding:"10px 14px" }}>
        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"9px", color:"#607080", letterSpacing:".15em", marginBottom:"6px" }}>FUSION LOGIC</div>
        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"11px", color:"#8A9AAA", lineHeight:1.6 }}>
          {isSpike
            ? "⚡ SPIKE WARNING — EXIT ALL POSITIONS IMMEDIATELY"
            : dir
              ? `All 3 engines agree: ${dir} — ${conf}% confidence`
              : "Engines disagree or insufficient data — WAIT"}
        </div>
      </div>

      {/* Signal bar */}
      <div style={{ flexShrink:0, padding:"12px 16px", background:isSpike?"rgba(255,214,0,0.1)":dir==="BUY"?"rgba(0,255,136,0.08)":dir==="SELL"?"rgba(255,59,92,0.08)":"rgba(10,13,18,0.98)", borderTop:`1px solid ${isSpike?"rgba(255,214,0,0.4)":dir==="BUY"?"rgba(0,255,136,0.35)":dir==="SELL"?"rgba(255,59,92,0.35)":"rgba(0,229,255,0.1)"}`, display:"flex", alignItems:"center", justifyContent:"center", gap:"12px" }}>
        <span style={{ fontSize:"20px" }}>{isSpike?"⚡":dir==="BUY"?"▲":dir==="SELL"?"▼":"◈"}</span>
        <span style={{ fontFamily:"'Orbitron',monospace", fontSize:"20px", fontWeight:900, letterSpacing:".25em", color:isSpike?"#FFD600":dir==="BUY"?"#00FF88":dir==="SELL"?"#FF3B5C":"#607080" }}>{isSpike?"SPIKE WARNING":dir||"SCANNING"}</span>
      </div>
    </div>
  );
}
