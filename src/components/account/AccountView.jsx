import { useState } from "react";
import { useApp } from "../../context/AppContext";

export default function AccountView() {
  const { state, dispatch, connectDeriv, connectPublic } = useApp();
  const [form, setForm] = useState({
    appId: state.account.appId || "",
    token: state.account.token || "",
  });
  const [accounts, setAccounts]   = useState([]);
  const [loading, setLoading]     = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Step 1 — fetch accounts list using PAT token
  const fetchAccounts = async () => {
    if (!form.appId || !form.token) {
      dispatch({ type: "SET_CONNECT_ERROR", payload: "App ID and PAT Token are required" });
      return;
    }
    dispatch({ type: "CLEAR_CONNECT_ERROR" });
    setLoading(true);
    try {
      const res = await fetch("https://api.derivws.com/trading/v1/options/accounts", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${form.token}`,
          "Deriv-App-ID": form.appId,
        },
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = json?.errors?.[0]?.message || `Error ${res.status}`;
        dispatch({ type: "SET_CONNECT_ERROR", payload: msg });
        setLoading(false);
        return;
      }
      const list = json?.data || [];
      setAccounts(list);
      if (list.length === 0) {
        dispatch({ type: "SET_CONNECT_ERROR", payload: "No Options accounts found for this token" });
      }
    } catch (err) {
      dispatch({ type: "SET_CONNECT_ERROR", payload: `Failed: ${err.message}` });
    }
    setLoading(false);
  };

  // Step 2 — connect to selected account
  const handleSelectAccount = async (acc) => {
    setConnecting(true);
    dispatch({ type: "SET_ACCOUNT", payload: { appId: form.appId, token: form.token, accountId: acc.id, username: acc.id } });
    await connectDeriv(form.appId, form.token, acc.id);
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
          <div className="form-hint">From developers.deriv.com → Registered Apps</div>
          <input
            className="form-input"
            type="text"
            placeholder="e.g. 33n1DzWkMeSWMFq8p0N3m"
            value={form.appId}
            onChange={e => setForm(f => ({ ...f, appId: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label className="form-label">PAT TOKEN</label>
          <div className="form-hint">From developers.deriv.com → API tokens</div>
          <input
            className="form-input"
            type="password"
            placeholder="pat_051e3c8a..."
            value={form.token}
            onChange={e => setForm(f => ({ ...f, token: e.target.value }))}
          />
        </div>

        <button className="form-btn" onClick={fetchAccounts} disabled={loading}>
          {loading ? "FETCHING ACCOUNTS..." : "FETCH MY ACCOUNTS"}
        </button>
        <button className="form-btn-secondary" onClick={handlePublic}>
          MARKET DATA ONLY (NO AUTH)
        </button>
      </div>

      {/* Account picker */}
      {accounts.length > 0 && (
        <>
          <div className="section-label">SELECT ACCOUNT TO CONNECT</div>
          <div className="profiles-grid">
            {accounts.map(acc => (
              <button
                key={acc.id}
                className={`profile-card ${connecting ? "profile-disabled" : ""}`}
                style={{ textAlign: "left", cursor: "pointer", background: "none", width: "100%" }}
                onClick={() => handleSelectAccount(acc)}
                disabled={connecting}
              >
                <div className="profile-top">
                  <span className="profile-name">{acc.id}</span>
                  <span className="pbadge">{acc.is_virtual ? "DEMO" : "REAL"}</span>
                </div>
                <div className="profile-server">
                  {acc.currency} · Balance: {acc.balance ?? "—"}
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {/* Connected info */}
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
        <div className="hint-title">HOW IT WORKS</div>
        <div className="hint-text">1. Enter App ID + PAT Token → Fetch Accounts</div>
        <div className="hint-text">2. Your accounts list appears — tap one to connect</div>
        <div className="hint-text">3. App auto-gets the correct account ID format</div>
      </div>
    </div>
  );
}
