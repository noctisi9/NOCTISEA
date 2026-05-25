import { useState } from "react";
import { useApp } from "../../context/AppContext";

export default function AccountView() {
  const { state, dispatch, connectDeriv, connectPublic } = useApp();
  const [form, setForm] = useState({
    appId:     state.account.appId     || "",
    token:     state.account.token     || "",
    accountId: state.account.username  || "",
  });
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!form.appId || !form.token || !form.accountId) {
      dispatch({ type: "SET_CONNECT_ERROR", payload: "All three fields are required" });
      return;
    }
    setConnecting(true);
    dispatch({ type: "SET_ACCOUNT", payload: { appId: form.appId, token: form.token, username: form.accountId } });
    await connectDeriv(form.appId, form.token, form.accountId);
    setConnecting(false);
  };

  const handlePublic = () => {
    connectPublic();
  };

  return (
    <div className="subview-container">
      <div className="subview-header">
        <span className="subview-icon">◈</span>
        <h2 className="subview-title">Account</h2>
      </div>

      {/* Error banner */}
      {state.connectError && (
        <div className="conn-error-banner">
          <span>⚠ {state.connectError}</span>
          <button onClick={() => dispatch({ type: "SET_CONNECT_ERROR", payload: null })}>✕</button>
        </div>
      )}

      <div className="form-card">
        <div className="form-group">
          <label className="form-label">APP ID</label>
          <div className="form-hint">From developers.deriv.com → Register app (PAT type)</div>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. 12345"
            value={form.appId}
            onChange={e => setForm(f => ({ ...f, appId: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">ACCOUNT ID</label>
          <div className="form-hint">Your CR or VRTC number from app.deriv.com</div>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. CR00122622 or VRTC1234567"
            value={form.accountId}
            onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">PAT TOKEN</label>
          <div className="form-hint">From developers.deriv.com → API tokens (trade + account_manage scope)</div>
          <input
            className="form-input"
            type="password"
            placeholder="Your Personal Access Token"
            value={form.token}
            onChange={e => setForm(f => ({ ...f, token: e.target.value }))}
          />
        </div>
        <button className="form-btn" onClick={handleConnect} disabled={connecting}>
          {connecting ? "CONNECTING..." : state.connected ? "✓ RECONNECT" : "CONNECT"}
        </button>
        <button className="form-btn-secondary" onClick={handlePublic}>
          MARKET DATA ONLY (no auth)
        </button>
      </div>

      {/* Live account info */}
      {state.connected && (
        <div className="account-info-card">
          <div className="ai-row">
            <span className="ai-label">BALANCE</span>
            <span className="ai-val">${(state.account.balance || 0).toFixed(2)} {state.account.currency}</span>
          </div>
          <div className="ai-row">
            <span className="ai-label">ACCOUNT</span>
            <span className="ai-val">{state.account.username}</span>
          </div>
          <div className="ai-row">
            <span className="ai-label">ENVIRONMENT</span>
            <span className={`ai-val ${state.environment === "LIVE" ? "val-pos" : ""}`}>
              {state.environment}
            </span>
          </div>
          <div className="ai-row">
            <span className="ai-label">STATUS</span>
            <span className="ai-val val-pos">● CONNECTED</span>
          </div>
        </div>
      )}

      {/* Setup guide */}
      <div className="api-token-hint">
        <div className="hint-title">SETUP GUIDE</div>
        <div className="hint-text">1. Go to developers.deriv.com and log in</div>
        <div className="hint-text">2. Register a new app → choose PAT type → get App ID</div>
        <div className="hint-text">3. Go to API tokens → create token with trade + account_manage</div>
        <div className="hint-text">4. Your Account ID is CR… or VRTC… from app.deriv.com top right</div>
      </div>
    </div>
  );
}
