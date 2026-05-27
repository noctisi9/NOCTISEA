import { useApp } from "../../context/AppContext";

export default function Header({ navigate }) {
  const { state, dispatch } = useApp();
  return (
    <header className="top-header">
      <div className="h-left">
        <button className="hamburger-menu" onClick={() => dispatch({ type: "TOGGLE_DRAWER" })}>
          <span className={`ham-line ${state.drawerOpen ? "o" : ""}`} />
          <span className={`ham-line ${state.drawerOpen ? "o" : ""}`} />
          <span className={`ham-line ${state.drawerOpen ? "o" : ""}`} />
        </button>
        <span className="header-brand" onClick={() => navigate("/")}>NOCTIS</span>
      </div>
      <div className="h-right">
        <div className={`conn-badge ${state.connected ? "live" : ""}`}>
          <span className={`dot ${state.connected ? "dot-live" : "dot-off"}`} />
          {state.connected ? "LIVE" : "OFFLINE"}
        </div>
      </div>
    </header>
  );
}
