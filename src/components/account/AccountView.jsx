import { useState } from "react";
import { useApp } from "../../context/AppContext";

export default function AccountView() {
  const { state, dispatch, connectDeriv, connectPublic } = useApp();
  const [form, setForm] = useState({
    appId:     state.account.appId     || "",
    accountId: state.account.accountId || "",
    token:     state.account.token     || "",
  });
  const [connecting, setConnecting] = useState(false);

  const handleConnect = async () => {
    if (!form.appId || !form.accountId || !form.token) {
      dispatch({ type: "SET_CONNECT_ERROR", payload: "All three fields are required" });
      return;
    }
    dispatch({ type: "CLEAR_CONNECT_ERROR" });
    dispatch({ type: "SET_ACCOUNT", payload: { appId: form.appId, accountId: form.accountId, token: form.token } });
    setConnecting(true);
    await connectDeriv(form.appId, form.token, form.accountId);
    setConnecting(false);
  };

  const handlePublic = () => {
    dispatch({ type: "CLEAR_CONNECT_ERROR" });
    connectPublic();
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
          <label className="form-label">APP ID</label>
          <div className="form-hint">From developers.deriv.com → Registered Apps → your PAT app</div>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. 33n1DzWkMeSWMFq8p0N3m"
            value={form.appId}
            onChange={e => setForm(f => ({ ...f, appId: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">ACCOUNT ID</label>
          <div className="form-hint">Your CR or VRTC number from app.deriv.com top right</div>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. CR00122622"
            value={form.accountId}
            onChange={e => setForm(f => ({ ...f, accountId: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">PAT TOKEN</label>
          <div className="form-hint">From developers.deriv.com → API tokens → your token (pat_...)</div>
          <input
            className="form-input"
            type="password"
            placeholder="pat_051e3c8a..."
            value={form.token}
            onChange={e => setForm(f => ({ ...f, token: e.target.value }))}
          />
        </div>

        <button className="form-btn" onClick={handleConnect} disabled={connecting}>
          {connecting ? "CONNECTING..." : state.connected ? "✓ RECONNECT" : "CONNECT"}
        </button>
        <button className="form-btn-secondary" onClick={handlePublic}>
          MARKET DATA ONLY (NO AUTH)
        </button>
      </div>

      {state.connected && (
        <div className="account-info-card">
          <div className="ai-row">
            <span className="ai-label">ACCOUNT</span>
            <span className="ai-val">{state.account.accountId || "—"}</span>
          </div>
          <div className="ai-row">
            <span className="ai-label">BALANCE</span>
            <span className="ai-val">${(state.account.balance || 0).toFixed(2)} {state.account.currency}</span>
          </div>
          <div className="ai-row">
            <span className="ai-label">ENVIRONMENT</span>
            <span className={`ai-val ${state.environment === "LIVE" ? "val-pos" : ""}`}>{state.environment}</span>
          </div>
          <div className="ai-row">
            <span className="ai-label">STATUS</span>
            <span className="ai-val val-pos">● CONNECTED</span>
          </div>
        </div>
      )}

      <div className="api-token-hint">
        <div className="hint-title">SETUP GUIDE</div>
        <div className="hint-text">1. developers.deriv.com → Registered Apps → copy your App ID (e.g. 33n1Dz...)</div>
        <div className="hint-text">2. developers.deriv.com → API tokens → copy your pat_... token</div>
        <div className="hint-text">3. Account ID = CR or VRTC number from app.deriv.com top-right</div>
        <div className="hint-text">4. Fill all 3 fields above → CONNECT</div>
      </div>
    </div>
  );
}
