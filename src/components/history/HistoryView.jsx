import { useApp } from "../../context/AppContext";

// Mock history data for demo
const mockHistory = [
  { id: 1, asset: "BOOM_1000", direction: "SELL", pnl: 12.40, date: new Date(Date.now() - 86400000 * 0 + 3600000 * 2), candles: 5 },
  { id: 2, asset: "CRASH_1000", direction: "BUY", pnl: -4.20, date: new Date(Date.now() - 86400000 * 0 + 3600000 * 5), candles: 5 },
  { id: 3, asset: "BOOM_1000", direction: "SELL", pnl: 8.75, date: new Date(Date.now() - 86400000 * 1 + 3600000 * 1), candles: 5 },
  { id: 4, asset: "CRASH_1000", direction: "BUY", pnl: 15.30, date: new Date(Date.now() - 86400000 * 1 + 3600000 * 6), candles: 5 },
  { id: 5, asset: "BOOM_1000", direction: "SELL", pnl: -2.10, date: new Date(Date.now() - 86400000 * 2 + 3600000 * 3), candles: 5 },
  { id: 6, asset: "CRASH_1000", direction: "BUY", pnl: 22.60, date: new Date(Date.now() - 86400000 * 2 + 3600000 * 7), candles: 5 },
];

function groupByDate(trades) {
  const groups = {};
  trades.forEach(t => {
    const key = new Date(t.date).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(t);
  });
  return Object.entries(groups).map(([date, trades]) => ({
    date,
    trades,
    total: trades.reduce((s, t) => s + t.pnl, 0),
  }));
}

function weekTotal(trades) {
  const weekAgo = Date.now() - 7 * 86400000;
  return trades.filter(t => new Date(t.date).getTime() > weekAgo).reduce((s, t) => s + t.pnl, 0);
}

export default function HistoryView() {
  const { state } = useApp();
  const allTrades = [...state.history, ...mockHistory];
  const groups = groupByDate(allTrades);
  const wTotal = weekTotal(allTrades);

  return (
    <div className="subview-container">
      <div className="subview-header">
        <span className="subview-icon">◎</span>
        <h2 className="subview-title">History</h2>
      </div>

      <div className="week-total-card">
        <span className="week-label">THIS WEEK</span>
        <span className={`week-val ${wTotal >= 0 ? "val-pos" : "val-neg"}`}>
          {wTotal >= 0 ? "+" : ""}${wTotal.toFixed(2)}
        </span>
      </div>

      <div className="history-timeline">
        {groups.map(group => (
          <div key={group.date} className="history-day">
            <div className="day-header">
              <span className="day-date">{group.date}</span>
              <span className={`day-total ${group.total >= 0 ? "val-pos" : "val-neg"}`}>
                {group.total >= 0 ? "+" : ""}${group.total.toFixed(2)}
              </span>
            </div>
            <div className="day-trades">
              {group.trades.map(trade => (
                <div key={trade.id} className="trade-row">
                  <div className="trade-left">
                    <span className={`trade-dir ${trade.direction === "BUY" ? "dir-buy" : "dir-sell"}`}>
                      {trade.direction === "BUY" ? "▲" : "▼"} {trade.direction}
                    </span>
                    <span className="trade-asset">{trade.asset?.replace("_", " ")}</span>
                  </div>
                  <div className="trade-right">
                    <span className={`trade-pnl ${trade.pnl >= 0 ? "val-pos" : "val-neg"}`}>
                      {trade.pnl >= 0 ? "+" : ""}${trade.pnl.toFixed(2)}
                    </span>
                    <span className="trade-time">
                      {new Date(trade.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
