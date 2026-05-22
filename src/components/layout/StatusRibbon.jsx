import { useApp } from "../../context/AppContext";

export default function StatusRibbon() {
  const { state } = useApp();
  const posCount = state.positions.length;
  const pnl = state.pnl;
  const balance = state.account.balance || 0;

  return (
    <div className="status-ribbon">
      <div className="ribbon-item">
        <span className="ribbon-val">{posCount}</span>
        <span className="ribbon-label">POS</span>
      </div>
      <div className="ribbon-divider" />
      <div className="ribbon-item">
        <span className={`ribbon-val ${pnl >= 0 ? "val-pos" : "val-neg"}`}>
          {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
        </span>
        <span className="ribbon-label">P&L</span>
      </div>
      <div className="ribbon-divider" />
      <div className="ribbon-item">
        <span className="ribbon-val">${balance.toFixed(0)}</span>
        <span className="ribbon-label">BAL</span>
      </div>
    </div>
  );
}
