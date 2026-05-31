import { useApp } from "../../context/AppContext";

const links = [
  { label: "Account", icon: "◈", view: "account", path: "/dashboard/account" },
  { label: "History", icon: "◎", view: "history", path: "/dashboard/history" },
];

export default function NavDrawer({ navigate }) {
  const { state, dispatch } = useApp();
  const go = (link) => {
    dispatch({ type: "SET_VIEW", payload: link.view });
    dispatch({ type: "CLOSE_DRAWER" });
    navigate(link.path);
  };
  return (
    <nav style={{
      position:"fixed", left:0, top:0, bottom:0, width:"260px",
      background:"#080B10", borderRight:"1px solid rgba(0,229,255,0.1)",
      zIndex:200, transform: state.drawerOpen ? "translateX(0)" : "translateX(-100%)",
      transition:"transform .3s cubic-bezier(.4,0,.2,1)",
      display:"flex", flexDirection:"column",
    }}>
      <div style={{ padding:"20px 20px", paddingTop:"68px", borderBottom:"1px solid rgba(0,229,255,0.08)" }}>
        <div style={{ fontFamily:"'Orbitron',monospace", fontSize:"18px", fontWeight:900, color:"#00E5FF", letterSpacing:".15em" }}>NOCTIS</div>
        <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:"10px", color:"#607080", letterSpacing:".25em", marginTop:"3px" }}>ITRADE XXIV</div>
      </div>
      <ul style={{ listStyle:"none", padding:"12px 0", flex:1 }}>
        {links.map(l => (
          <li key={l.view}>
            <button
              onClick={() => go(l)}
              style={{
                width:"100%", display:"flex", alignItems:"center",
                padding:"14px 20px", gap:"12px",
                background: state.currentView===l.view ? "rgba(0,229,255,0.07)" : "none",
                border:"none", borderLeft: state.currentView===l.view ? "2px solid #00E5FF" : "2px solid transparent",
                color: state.currentView===l.view ? "#00E5FF" : "#607080",
                fontFamily:"'Rajdhani',sans-serif", fontSize:"15px", fontWeight:500,
                letterSpacing:".08em", cursor:"pointer", transition:"all .2s",
              }}>
              <span>{l.icon}</span>
              <span>{l.label}</span>
              <span style={{ marginLeft:"auto", opacity:.4 }}>›</span>
            </button>
          </li>
        ))}
      </ul>
      <div style={{ padding:"16px 20px", borderTop:"1px solid rgba(0,229,255,0.08)", fontFamily:"'Share Tech Mono',monospace", fontSize:"10px", color:"#3A4A55", letterSpacing:".1em" }}>
        <div style={{ marginBottom:"4px" }}>
          <span style={{ display:"inline-block", width:"7px", height:"7px", borderRadius:"50%", background: state.connected?"#00FF88":"#333", marginRight:"6px", boxShadow: state.connected?"0 0 6px #00FF88":"none" }} />
          {state.connected ? `LIVE · ${state.environment}` : "OFFLINE"}
        </div>
        NOCTIS v3.0.0
      </div>
    </nav>
  );
}
