import { useEffect } from "react";
import { useApp } from "../../context/AppContext";

export default function WhatsAppView() {
  const { state, dispatch } = useApp();

  useEffect(() => {
    // Simulate QR code fetch from backend server
    fetch("/api/whatsapp/qr")
      .then(r => r.json())
      .then(d => {
        if (d.qr) dispatch({ type: "SET_QR", payload: d.qr });
        if (d.status) dispatch({ type: "SET_WA_STATUS", payload: d.status });
      })
      .catch(() => {
        dispatch({ type: "SET_WA_STATUS", payload: "backend_offline" });
      });

    // Poll for status updates
    const interval = setInterval(() => {
      fetch("/api/whatsapp/status")
        .then(r => r.json())
        .then(d => { if (d.status) dispatch({ type: "SET_WA_STATUS", payload: d.status }); })
        .catch(() => {});
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const statusMap = {
    disconnected: { label: "Awaiting QR Scan", color: "#AA7C11" },
    connecting: { label: "Connecting...", color: "#D4AF37" },
    connected: { label: "Connected", color: "#2ECC71" },
    backend_offline: { label: "Backend Offline", color: "#C0392B" },
  };
  const st = statusMap[state.whatsappStatus] || statusMap.disconnected;

  return (
    <div className="subview-container">
      <div className="subview-header">
        <span className="subview-icon">◉</span>
        <h2 className="subview-title">WhatsApp Relay</h2>
      </div>

      <div className="wa-status-bar" style={{ borderColor: st.color }}>
        <span className="wa-dot" style={{ background: st.color }} />
        <span className="wa-status-label" style={{ color: st.color }}>{st.label}</span>
      </div>

      <div className="qr-card">
        {state.whatsappStatus === "connected" ? (
          <div className="qr-connected">
            <div className="qr-check">✓</div>
            <div className="qr-connected-text">WhatsApp Web Active</div>
            <div className="qr-connected-sub">Group relay is streaming execution alerts</div>
          </div>
        ) : state.qrCode ? (
          <img src={state.qrCode} alt="WhatsApp QR Code" className="qr-image" />
        ) : (
          <div className="qr-placeholder">
            <div className="qr-spinner" />
            <div className="qr-loading-text">
              {state.whatsappStatus === "backend_offline"
                ? "Start Node.js backend to generate QR"
                : "Generating QR Code..."}
            </div>
          </div>
        )}
      </div>

      <div className="wa-info-block">
        <div className="wa-info-title">HOW IT WORKS</div>
        <div className="wa-info-row">
          <span className="wa-step-num">01</span>
          <span>Backend generates WhatsApp Web QR via whatsapp-web.js</span>
        </div>
        <div className="wa-info-row">
          <span className="wa-step-num">02</span>
          <span>Scan QR with your WhatsApp mobile app</span>
        </div>
        <div className="wa-info-row">
          <span className="wa-step-num">03</span>
          <span>Trade alerts auto-relay to your target group</span>
        </div>
      </div>

      <div className="wa-preview-block">
        <div className="wa-preview-title">MESSAGE PREVIEW</div>
        <div className="wa-preview-msg entry">
          SELL BOOM1000 | TP 5 CANDLES
        </div>
        <div className="wa-preview-msg exit">
          TRADE COMPLETE. NOX ❄️
        </div>
      </div>
    </div>
  );
}
