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
    <nav className={`nav-drawer ${state.drawerOpen ? "drawer-open" : ""}`}>
      <div className="drawer-header">
        <div className="drawer-brand">NOCTIS</div>
        <div className="drawer-sub">ITRADE XXIV</div>
      </div>
      <ul className="drawer-links">
        {links.map(l => (
          <li key={l.view}>
            <button className={`drawer-link ${state.currentView === l.view ? "active" : ""}`} onClick={() => go(l)}>
              <span className="drawer-icon">{l.icon}</span>
              <span>{l.label}</span>
              <span className="drawer-chev">›</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="drawer-footer">
        <div style={{marginBottom:"4px"}}><span className={`dot ${state.connected?"dot-live":"dot-off"}`} style={{display:"inline-block",marginRight:"6px"}} />{state.connected ? `LIVE · ${state.environment}` : "OFFLINE"}</div>
        NOCTIS v3.0.0
      </div>
    </nav>
  );
}
