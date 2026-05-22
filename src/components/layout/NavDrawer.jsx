import { useApp } from "../../context/AppContext";

const navLinks = [
  { label: "Account", icon: "◈", view: "account", path: "/dashboard/account" },
  { label: "WhatsApp", icon: "◉", view: "whatsapp", path: "/dashboard/whatsapp" },
  { label: "Settings", icon: "◎", view: "history", path: "/dashboard/settings" },
];

export default function NavDrawer({ navigate }) {
  const { state, dispatch } = useApp();

  const handleNav = (link) => {
    dispatch({ type: "SET_VIEW", payload: link.view });
    dispatch({ type: "CLOSE_DRAWER" });
    navigate(link.path);
  };

  return (
    <nav className={`nav-drawer ${state.drawerOpen ? "drawer-open" : ""}`}>
      <div className="drawer-header">
        <div className="drawer-logo">
          <div className="drawer-logo-icon">⬡</div>
          <div>
            <div className="drawer-brand">NOCTIS EA</div>
            <div className="drawer-subbrand">ITRADE XXIV</div>
          </div>
        </div>
      </div>
      <div className="drawer-divider" />
      <ul className="drawer-links">
        {navLinks.map((link) => (
          <li key={link.view}>
            <button
              className={`drawer-link ${state.currentView === link.view ? "drawer-link-active" : ""}`}
              onClick={() => handleNav(link)}
            >
              <span className="drawer-icon">{link.icon}</span>
              <span>{link.label}</span>
              <span className="drawer-chevron">›</span>
            </button>
          </li>
        ))}
      </ul>
      <div className="drawer-footer">
        <div className="drawer-status">
          <span className={`conn-dot ${state.connected ? "dot-live" : "dot-off"}`} />
          <span className="drawer-status-text">
            {state.connected ? `Connected · ${state.environment}` : "Disconnected"}
          </span>
        </div>
        <div className="drawer-version">NOCTIS EA v2.4.1</div>
      </div>
    </nav>
  );
}
