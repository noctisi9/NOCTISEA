import { useState } from "react";
import { useApp } from "../../context/AppContext";

const LOT_SIZES = [0.20, 0.50, 1, 10, 20, 50];

// Calculate P&L for a given lot size based on price move
// $1 per point per lot on BOOM/CRASH M1
function calcPnL(entryPrice, exitPrice, direction, lotSize) {
  if (!entryPrice || !exitPrice) return 0;
  const move = direction === "BUY"
    ? exitPrice - entryPrice   // CRASH: want price to go up
    : entryPrice - exitPrice;  // BOOM: want price to go down
  return parseFloat((move * lotSize).toFixed(2));
}

function SignalCard({ record }) {
  const [expanded, setExpanded] = useState(false);
  const move = record.direction === "BUY"
    ? record.exitPrice - record.entryPrice
    : record.entryPrice - record.exitPrice;
  const win = move > 0;

  return (
    <div className={`signal-card ${win ? "sig-win" : "sig-loss"}`} onClick={() => setExpanded(e => !e)}>
      <div className="sc-top">
        <div className="sc-left">
          <span className={`sc-dir ${record.direction === "BUY" ? "buy" : "sell"}`}>
            {record.direction === "BUY" ? "▲" : "▼"} {record.direction}
          </span>
          <span className="sc-asset">{record.asset.replace("_", " ")}</span>
        </div>
        <div className="sc-right">
          <span className={`sc-result ${win ? "win" : "loss"}`}>{win ? "WIN" : "LOSS"}</span>
          <span className="sc-time">
            {new Date(record.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      <div className="sc-prices">
        <span>Entry {record.entryPrice?.toFixed(2) || "—"}</span>
        <span className="sc-arrow">→</span>
        <span>Exit {record.exitPrice?.toFixed(2) || "—"}</span>
        <span className={`sc-move ${win ? "pos" : "neg"}`}>
          {move > 0 ? "+" : ""}{move.toFixed(2)} pts
        </span>
      </div>

      {expanded && (
        <div className="sc-breakdown">
          <div className="sb-title">P&L BY LOT SIZE</div>
          <div className="sb-grid">
            {LOT_SIZES.map(lot => {
              const pnl = calcPnL(record.entryPrice, record.exitPrice, record.direction, lot);
              return (
                <div key={lot} className="sb-row">
                  <span className="sb-lot">{lot.toFixed(2)}</span>
                  <span className={`sb-pnl ${pnl >= 0 ? "pos" : "neg"}`}>
                    {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="sc-chevron">{expanded ? "▲" : "▼"}</div>
    </div>
  );
}

// Mock data for demo
const mockSignals = [
  { id: 1, asset: "BOOM_1000",  direction: "SELL", entryPrice: 13420.50, exitPrice: 13395.20, date: new Date(Date.now() - 3600e3*1) },
  { id: 2, asset: "CRASH_1000", direction: "BUY",  entryPrice: 5672.30,  exitPrice: 5698.80,  date: new Date(Date.now() - 3600e3*2) },
  { id: 3, asset: "BOOM_1000",  direction: "SELL", entryPrice: 13380.00, exitPrice: 13392.50, date: new Date(Date.now() - 3600e3*4) },
  { id: 4, asset: "CRASH_1000", direction: "BUY",  entryPrice: 5640.10,  exitPrice: 5628.90,  date: new Date(Date.now() - 86400e3 + 3600e3*1) },
  { id: 5, asset: "BOOM_1000",  direction: "SELL", entryPrice: 13310.00, exitPrice: 13275.40, date: new Date(Date.now() - 86400e3 + 3600e3*3) },
  { id: 6, asset: "CRASH_1000", direction: "BUY",  entryPrice: 5590.20,  exitPrice: 5621.70,  date: new Date(Date.now() - 86400e3*2 + 3600e3*2) },
];

function groupByDate(records) {
  const g = {};
  records.forEach(r => {
    const k = new Date(r.date).toDateString();
    if (!g[k]) g[k] = [];
    g[k].push(r);
  });
  return Object.entries(g);
}

export default function HistoryView() {
  const { state } = useApp();
  const all = [...state.history, ...mockSignals];
  const groups = groupByDate(all);

  const totalWins   = all.filter(r => (r.direction === "BUY" ? r.exitPrice - r.entryPrice : r.entryPrice - r.exitPrice) > 0).length;
  const totalLosses = all.length - totalWins;
  const weekPnL     = all
    .filter(r => new Date(r.date) > new Date(Date.now() - 7*86400e3))
    .reduce((s, r) => {
      const move = r.direction === "BUY" ? r.exitPrice - r.entryPrice : r.entryPrice - r.exitPrice;
      return s + move * 1; // 1 lot reference
    }, 0);

  return (
    <div className="subview-container">
      <div className="subview-header">
        <span className="subview-icon">◎</span>
        <h2 className="subview-title">Signal History</h2>
      </div>

      {/* Summary stats */}
      <div className="hist-stats">
        <div className="hstat">
          <span className="hstat-v pos">{totalWins}</span>
          <span className="hstat-l">WINS</span>
        </div>
        <div className="hstat-div" />
        <div className="hstat">
          <span className="hstat-v neg">{totalLosses}</span>
          <span className="hstat-l">LOSSES</span>
        </div>
        <div className="hstat-div" />
        <div className="hstat">
          <span className={`hstat-v ${totalWins + totalLosses > 0 ? (totalWins/(totalWins+totalLosses)*100 >= 50 ? "pos" : "neg") : ""}`}>
            {totalWins + totalLosses > 0 ? Math.round(totalWins/(totalWins+totalLosses)*100) : 0}%
          </span>
          <span className="hstat-l">WIN RATE</span>
        </div>
        <div className="hstat-div" />
        <div className="hstat">
          <span className={`hstat-v ${weekPnL >= 0 ? "pos" : "neg"}`}>
            {weekPnL >= 0 ? "+" : ""}{weekPnL.toFixed(1)}
          </span>
          <span className="hstat-l">7D PTS</span>
        </div>
      </div>

      <div className="hist-note">Tap a card to see P&L by lot size · 5-candle signals</div>

      {/* Timeline */}
      {groups.map(([date, records]) => (
        <div key={date}>
          <div className="hist-date-header">
            <span className="hist-date">{date}</span>
            <span className="hist-count">{records.length} signals</span>
          </div>
          {records.map(r => <SignalCard key={r.id} record={r} />)}
        </div>
      ))}

      {all.length === 0 && (
        <div className="hist-empty">No signals recorded yet. Start the app to begin tracking.</div>
      )}
    </div>
  );
}
