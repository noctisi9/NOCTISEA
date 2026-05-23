import { useState } from "react";
import { useApp } from "../../context/AppContext";

const savedProfiles = [
  { id: 1, label: "Deriv Demo", server: "demo.deriv.com", username: "CR123456", active: true },
  { id: 2, label: "Deriv Real", server: "real.deriv.com", username: "CR789012", active: false },
];

export default function AccountView() {
  const { state, dispatch, connectDeriv } = useApp();
  const [form, setForm] = useState({
    server: state.account.server || "",
    username: state.account.username || "",
    password: "",
  });
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    setConnecting(true);
    dispatch({ type: "SET_ACCOUNT", payload: { server: form.server, username: form.username, password: form.password } });
    connectDeriv(form.password || null);
    setTimeout(() => setConnecting(false), 3000);
  };

  return (
    <div className="subview-container">
      <div className="subview-header">
        <span className="subview-icon">◈</span>
        <h2 className="subview-title">Account</h2>
      </div>

      <div className="form-card">
        <div className="form-group">
          <label className="form-label">BROKER SERVER DOMAIN</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. ws.binaryws.com"
            value={form.server}
            onChange={e => setForm(f => ({ ...f, server: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">USERNAME / LOGIN ID</label>
          <input
            className="form-input"
            type="text"
            placeholder="Deriv account ID e.g. CR123456"
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">API TOKEN</label>
          <input
            className="form-input"
            type="password"
            placeholder="Deriv API token (from app.deriv.com)"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          />
        </div>
        <button className="form-btn" onClick={handleConnect} disabled={connecting}>
          {connecting ? "CONNECTING..." : state.connected ? "✓ RECONNECT" : "CONNECT"}
        </button>
      </div>

      {state.connected && (
        <div className="account-info-card">
          <div className="ai-row">
            <span className="ai-label">BALANCE</span>
            <span className="ai-val">${(state.account.balance || 0).toFixed(2)}</span>
          </div>
          <div className="ai-row">
            <span className="ai-label">ENVIRONMENT</span>
            <span className="ai-val">{state.environment}</span>
          </div>
          <div className="ai-row">
            <span className="ai-label">STATUS</span>
            <span className="ai-val val-pos">● LIVE</span>
          </div>
        </div>
      )}

      <div className="section-label">SAVED PROFILES</div>
      <div className="profiles-grid">
        {savedProfiles.map(p => (
          <div key={p.id} className={`profile-card ${p.active ? "profile-active" : ""}`}>
            <div className="profile-top">
              <span className="profile-name">{p.label}</span>
              {p.active && <span className="profile-badge">ACTIVE</span>}
            </div>
            <div className="profile-server">{p.server}</div>
            <div className="profile-user">{p.username}</div>
          </div>
        ))}
      </div>

      <div className="api-token-hint">
        <div className="hint-title">HOW TO GET YOUR API TOKEN</div>
        <div className="hint-text">1. Go to app.deriv.com/account/api-token</div>
        <div className="hint-text">2. Create a token with Read + Trade permissions</div>
        <div className="hint-text">3. Paste it into the API Token field above</div>
      </div>
    </div>
  );
}
