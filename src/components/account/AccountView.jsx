import { useState } from "react";
import { useApp } from "../../context/AppContext";

const savedProfiles = [
  { id: 1, label: "Deriv Demo", server: "demo.deriv.com", username: "CR123456", active: true },
  { id: 2, label: "Deriv Real", server: "real.deriv.com", username: "CR789012", active: false },
];

export default function AccountView() {
  const { state, dispatch, connectDeriv } = useApp();
  const [form, setForm] = useState({ server: state.account.server || "", username: state.account.username || "", password: "" });

  const handleConnect = () => {
    dispatch({ type: "UPDATE_ACCOUNT", payload: { server: form.server, username: form.username } });
    connectDeriv(form.password);
  };

  return (
    <div className="subview-container">
      <div className="subview-header">
        <span className="subview-icon">◈</span>
        <h2 className="subview-title">Account</h2>
      </div>

      <div className="form-card">
        <div className="form-group">
          <label className="form-label">Broker Server Domain</label>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. ws.binaryws.com"
            value={form.server}
            onChange={e => setForm(f => ({ ...f, server: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">Username / Login ID</label>
          <input
            className="form-input"
            type="text"
            placeholder="Deriv / MetaTrader ID"
            value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">API Token / Password</label>
          <input
            className="form-input"
            type="password"
            placeholder="API token or MT password"
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
          />
        </div>
        <button className="form-btn" onClick={handleConnect}>
          {state.connected ? "✓ CONNECTED" : "CONNECT"}
        </button>
      </div>

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

      {state.connected && (
        <div className="account-info-card">
          <div className="ai-row">
            <span className="ai-label">Balance</span>
            <span className="ai-val">${(state.account.balance || 0).toFixed(2)}</span>
          </div>
          <div className="ai-row">
            <span className="ai-label">Environment</span>
            <span className="ai-val">{state.environment}</span>
          </div>
          <div className="ai-row">
            <span className="ai-label">Status</span>
            <span className="ai-val val-pos">● LIVE</span>
          </div>
        </div>
      )}
    </div>
  );
}
