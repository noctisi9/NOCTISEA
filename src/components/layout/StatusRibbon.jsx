import { useApp } from "../../context/AppContext";

export default function StatusRibbon() {
  const { state } = useApp();
  const pnl = state.pnl || 0;
  return (
    <div className="ribbon">
      <div className="rib-item">
        <span className="rib-v">{state.positions?.length || 0}</span>
        <span className="rib-l">POS</span>
      </div>
      <div className="rib-div" />
      <div className="rib-item">
        <span className={`rib-v ${pnl > 0 ? "pos" : pnl < 0 ? "neg" : ""}`}>
          {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
        </span>
        <span className="rib-l">P&L</span>
      </div>
      <div className="rib-div" />
      <div className="rib-item">
        <span className="rib-v">${(state.account?.balance || 0).toFixed(0)}</span>
        <span className="rib-l">BAL</span>
      </div>
    </div>
  );
}
