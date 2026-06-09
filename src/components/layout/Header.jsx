import { useApp } from "../../context/AppContext";

export default function Header({ navigate }) {
  const { state, dispatch } = useApp();
  const asset = state.activeAsset?.replace("_", " ") || "BOOM 1000";

  return (
    <header style={{
      height: 60, flexShrink: 0,
      background: "#0A0A0A",
      borderBottom: "1px solid rgba(255,255,255,0.07)",
      display: "flex", alignItems: "center",
      justifyContent: "space-between",
      padding: "0 16px",
      fontFamily: "'Rajdhani', sans-serif",
    }}>

      {/* Left: avatar circle + asset name */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.14)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 13, fontWeight: 700, color: "#fff",
          fontFamily: "'Orbitron', monospace",
          cursor: "pointer",
          flexShrink: 0,
        }} onClick={() => navigate("/")}>Z</div>

        <div>
          <div style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: 14, fontWeight: 700,
            color: "#FFFFFF", letterSpacing: "0.1em",
          }}>{asset}</div>
          <div style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 10, color: "rgba(255,255,255,0.35)",
            letterSpacing: "0.08em",
          }}>
            <span style={{
              display: "inline-block", width: 6, height: 6,
              borderRadius: "50%", marginRight: 5,
              background: state.connected ? "#fff" : "rgba(255,255,255,0.2)",
              boxShadow: state.connected ? "0 0 6px #fff" : "none",
              verticalAlign: "middle",
            }} />
            {state.connected ? "LIVE" : "OFFLINE"}
          </div>
        </div>
      </div>

      {/* Right: bell + history icon */}
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {/* Bell */}
        <button style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "rgba(255,255,255,0.05)",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, cursor: "pointer",
        }}>🔔</button>

        {/* History / signal history icon */}
        <button
          onClick={() => navigate("/dashboard/history")}
          style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "rgba(255,255,255,0.6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, cursor: "pointer",
          }}>
          {/* list/history icon */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="3" width="10" height="1.5" rx="0.75" fill="rgba(255,255,255,0.7)" />
            <rect x="2" y="7" width="8" height="1.5" rx="0.75" fill="rgba(255,255,255,0.7)" />
            <rect x="2" y="11" width="6" height="1.5" rx="0.75" fill="rgba(255,255,255,0.7)" />
          </svg>
        </button>
      </div>
    </header>
  );
}
