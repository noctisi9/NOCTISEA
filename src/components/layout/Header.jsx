import { useApp } from "../../context/AppContext";

export default function Header({ navigate }) {
  const { state, dispatch } = useApp();

  return (
    <header className="top-header">
      <div className="header-left">
        <button className="hamburger-menu" onClick={() => dispatch({ type: "TOGGLE_DRAWER" })} aria-label="Open navigation">
          <span className={`ham-line ${state.drawerOpen ? "open" : ""}`} />
          <span className={`ham-line ${state.drawerOpen ? "open" : ""}`} />
          <span className={`ham-line ${state.drawerOpen ? "open" : ""}`} />
        </button>
        <span className="header-brand" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
          NOCTIS <span className="brand-gold">EA</span>
        </span>
      </div>
      <div className="header-right">
        <div className={`env-badge ${state.environment === "LIVE" ? "env-live" : "env-demo"}`}>
          {state.environment}
        </div>
        <div className={`conn-badge ${state.connected ? "conn-live" : "conn-off"}`}>
          <span className={`conn-dot ${state.connected ? "dot-live" : "dot-off"}`} />
          {state.connected ? "LIVE" : "OFFLINE"}
        </div>
      </div>
    </header>
  );
}
