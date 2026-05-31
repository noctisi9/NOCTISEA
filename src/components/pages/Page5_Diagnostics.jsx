import { useApp } from "../../context/AppContext";

export default function Page5_Diagnostics() {
  const { state } = useApp();
  const sig = state.signals;
  const of  = state.orderflow;
  const ts  = state.tickStats;
  const wf  = state.welford;

  const section = (title, rows) => (
    <div style={{ margin:"0 12px 10px", background:"#111820", border:"1px solid rgba(0,229,255,0.08)", borderRadius:"4px", overflow:"hidden" }}>
      <div style={{ padding:"6px 14px", background:"rgba(0,229,255,0.05)", borderBottom:"1px solid rgba(0,229,255,0.08)", fontFamily:"'Orbitron',monospace", fontSize:"11px", color:"#00E5FF", letterSpacing:".15em" }}>{title}</div>
      {rows.map(([l,v,c="#E0EAF4"],i)=>(
        <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"8px 14px", borderBottom:"1px solid rgba(0,229,255,0.04)" }}>
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"11px", color:"#607080", letterSpacing:".08em" }}>{l}</span>
          <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"11px", fontWeight:700, color:c }}>{v}</span>
        </div>
      ))}
    </div>
  );

  const aoState = sig.ao>0&&sig.ac>0?"BULLISH":sig.ao<0&&sig.ac<0?"BEARISH":"NEUTRAL";
  const ofState = of.absorptionDetected?"ABSORPTION":of.cumulativeDelta>0?"STRONG BUYERS":"STRONG SELLERS";
  const tickState = sig.spikeWarning?"COMPRESSION DETECTED":ts.hz>18?"HIGH ACTIVITY":ts.hz>8?"NORMAL":"LOW Hz";

  const overall = sig.spikeWarning ? "SPIKE WARNING — DO NOT ENTER" : sig.direction ? sig.direction+" — "+sig.confidence+"% CONFIDENCE" : "WAIT";
  const overallColor = sig.spikeWarning?"#FFD600":sig.direction==="BUY"?"#00FF88":sig.direction==="SELL"?"#FF3B5C":"#607080";

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", overflow:"hidden" }}>
      <div style={{ padding:"10px 16px 6px", flexShrink:0 }}>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:"14px", color:"#00E5FF", letterSpacing:".15em" }}>DIAGNOSTICS</div>
        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"10px", color:"#607080", marginTop:"2px" }}>FULL MARKET VIEW</div>
      </div>

      <div style={{ flex:1, overflowY:"auto", paddingBottom:"8px" }}>
        {section("AO / AC ENGINE",[
          ["AO VALUE", (sig.ao>=0?"+":"")+((sig.ao||0).toFixed(4)), sig.ao>=0?"#00FF88":"#FF3B5C"],
          ["AC VALUE", (sig.ac>=0?"+":"")+((sig.ac||0).toFixed(4)), sig.ac>=0?"#00FF88":"#FF3B5C"],
          ["MOMENTUM", aoState, aoState==="BULLISH"?"#00FF88":aoState==="BEARISH"?"#FF3B5C":"#607080"],
          ["SIGNAL", sig.e1Signal||"WAIT", sig.e1Signal==="BUY"?"#00FF88":sig.e1Signal==="SELL"?"#FF3B5C":"#607080"],
        ])}
        {section("ORDERFLOW ENGINE",[
          ["CVD", (of.cumulativeDelta>=0?"+":"")+(of.cumulativeDelta||0), of.cumulativeDelta>=0?"#00FF88":"#FF3B5C"],
          ["POC", (of.pocLevel||0).toFixed(2), "#FFD600"],
          ["ABSORPTION", of.absorptionDetected?"DETECTED":"CLEAR", of.absorptionDetected?"#FF3B5C":"#00FF88"],
          ["STATE", ofState, of.absorptionDetected?"#FFD600":of.cumulativeDelta>=0?"#00FF88":"#FF3B5C"],
          ["SIGNAL", sig.ofSignal||"WAIT", sig.ofSignal==="BUY"?"#00FF88":sig.ofSignal==="SELL"?"#FF3B5C":"#607080"],
        ])}
        {section("TICK / WELFORD ENGINE",[
          ["σ CURRENT", (wf.stdDev||0).toFixed(4), wf.compressionWarning?"#FFD600":"#E0EAF4"],
          ["σ MEAN", (wf.sigmaMean||0).toFixed(4)],
          ["COMPRESSION %", Math.max(0,Math.round((1-(wf.stdDev/(wf.sigmaMean||1)))*100))+"%"],
          ["CURRENT Hz", (ts.hz||0)+" Hz", ts.hz<8?"#FF3B5C":ts.hz<=18?"#00FF88":"#FFD600"],
          ["STATE", tickState, sig.spikeWarning?"#FFD600":"#E0EAF4"],
          ["SIGNAL", sig.tickSignal||"WAIT", sig.tickSignal==="BUY"?"#00FF88":sig.tickSignal==="SELL"?"#FF3B5C":sig.tickSignal==="SPIKE WARNING"?"#FFD600":"#607080"],
        ])}

        {/* Market state summary */}
        <div style={{ margin:"0 12px 10px", background:"#111820", border:`1px solid ${overallColor}44`, borderRadius:"4px", padding:"12px 14px" }}>
          <div style={{ fontFamily:"'Orbitron',monospace", fontSize:"11px", color:"#00E5FF", letterSpacing:".15em", marginBottom:"10px" }}>MARKET STATE SUMMARY</div>
          {[
            ["AO/AC:", aoState],
            ["ORDERFLOW:", ofState],
            ["TICK ENGINE:", tickState],
          ].map(([l,v],i)=>(
            <div key={i} style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"11px", color:"#8A9AAA", marginBottom:"4px" }}>
              <span style={{ color:"#607080" }}>{l}</span> {v}
            </div>
          ))}
          <div style={{ marginTop:"10px", borderTop:"1px solid rgba(0,229,255,0.08)", paddingTop:"10px" }}>
            <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"10px", color:"#607080", letterSpacing:".12em", marginBottom:"4px" }}>OVERALL</div>
            <div style={{ fontFamily:"'Orbitron',monospace", fontSize:"16px", fontWeight:900, color:overallColor, letterSpacing:".15em" }}>{overall}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
