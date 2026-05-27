import { useState } from "react";
import { useApp } from "../../context/AppContext";

export default function AccountView() {
  const { state, dispatch, connectDeriv, connectPublic } = useApp();
  const [token, setToken]       = useState(state.account.token || "");
  const [connecting, setConnecting] = useState(false);

  const handleConnect = () => {
    if (!token.trim()) {
      dispatch({ type: "SET_CONNECT_ERROR", payload: "PAT Token is required" });
      return;
    }
    dispatch({ type: "CLEAR_CONNECT_ERROR" });
    dispatch({ type: "SET_ACCOUNT", payload: { token: token.trim() } });
    setConnecting(true);
    connectPublic(); // use market data only — public WS
    setTimeout(() => setConnecting(false), 3000);
  };

  return (
    <div className="subview-container">
      <div className="subview-header">
        <span className="subview-icon">◈</span>
        <h2 className="subview-title">Account</h2>
      </div>

      {state.connectError && (
        <div className="conn-error-banner">
          <span>⚠ {state.connectError}</span>
          <button onClick={() => dispatch({ type: "CLEAR_CONNECT_ERROR" })}>✕</button>
        </div>
      )}

      <div className="form-card">
        <div className="form-group">
          <label className="form-label">PAT TOKEN</label>
          <div className="form-hint">From app.deriv.com/account/api-token — enable Read + Trade</div>
          <input
            className="form-input"
            type="password"
            placeholder="Paste your Deriv API token"
            value={token}
            onChange={e => setToken(e.target.value)}
          />
        </div>
        <button className="form-btn" onClick={handleConnect} disabled={connecting}>
          {connecting ? "CONNECTING..." : state.connected ? "✓ RECONNECT" : "CONNECT"}
        </button>
      </div>

      {state.connected && (
        <div className="account-info-card">
          <div className="ai-row">
            <span className="ai-label">STATUS</span>
            <span className="ai-val pos">● CONNECTED</span>
          </div>
          <div className="ai-row">
            <span className="ai-label">ENVIRONMENT</span>
            <span className="ai-val">{state.environment}</span>
          </div>
          <div className="ai-row">
            <span className="ai-label">BALANCE</span>
            <span className="ai-val">${(state.account.balance || 0).toFixed(2)} {state.account.currency || "USD"}</span>
          </div>
        </div>
      )}

      <div className="api-token-hint">
        <div className="hint-title">HOW TO GET YOUR TOKEN</div>
        <div className="hint-text">1. Go to app.deriv.com/account/api-token</div>
        <div className="hint-text">2. Create token — tick Read + Trade</div>
        <div className="hint-text">3. Paste above and hit CONNECT</div>
      </div>
    </div>
  );
}
