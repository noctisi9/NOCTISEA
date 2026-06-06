import { useState, useEffect } from "react";
import { useApp } from "../../context/AppContext";

const LOT_SIZES = [0.20, 0.50, 1, 10, 20, 50];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function calcPnL(entry, exit, dir, lot) {
  if (!entry || !exit) return 0;
  return parseFloat(((dir === "BUY" ? exit - entry : entry - exit) * lot).toFixed(2));
}

function tradeMove(r) {
  return r.direction === "BUY" ? (r.exitPrice - r.entryPrice) : (r.entryPrice - r.exitPrice);
}

function SignalCard({ record }) {
  const [expanded, setExpanded] = useState(false);
  const move = tradeMove(record);
  const win  = move > 0;
  return (
    <div onClick={() => setExpanded(e => !e)} style={{
      background: win ? "rgba(0,255,136,0.04)" : "rgba(255,59,92,0.04)",
      border: `1px solid ${win ? "rgba(0,255,136,0.2)" : "rgba(255,59,92,0.2)"}`,
      borderRadius: "5px", marginBottom: "6px", padding: "10px 12px", cursor: "pointer",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontFamily: "'Orbitron',monospace", fontSize: "12px", fontWeight: 700,
            color: record.direction === "BUY" ? "#00FF88" : "#FF3B5C" }}>
            {record.direction === "BUY" ? "▲" : "▼"} {record.direction}
          </span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#607080" }}>
            {(record.asset || "").replace("_"," ")}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontFamily: "'Orbitron',monospace", fontSize: "11px", fontWeight: 700,
            color: win ? "#00FF88" : "#FF3B5C" }}>{win ? "WIN" : "LOSS"}</span>
          <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#607080" }}>
            {new Date(record.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "5px",
        fontFamily: "'Share Tech Mono',monospace", fontSize: "10px", color: "#8A9AAA" }}>
        <span>{record.entryPrice?.toFixed(2) || "—"}</span>
        <span style={{ color: "#607080" }}>→</span>
        <span>{record.exitPrice?.toFixed(2) || "—"}</span>
        <span style={{ marginLeft: "auto", color: win ? "#00FF88" : "#FF3B5C", fontWeight: 700 }}>
          {move > 0 ? "+" : ""}{move.toFixed(2)} pts
        </span>
      </div>

      {expanded && (
        <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(0,229,255,0.08)" }}>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", color: "#607080",
            letterSpacing: ".1em", marginBottom: "6px" }}>P&L BY LOT SIZE</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "4px" }}>
            {LOT_SIZES.map(lot => {
              const pnl = calcPnL(record.entryPrice, record.exitPrice, record.direction, lot);
              return (
                <div key={lot} style={{ background: "#0A0D12", borderRadius: "3px", padding: "4px 6px",
                  display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#607080" }}>{lot}</span>
                  <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", fontWeight: 700,
                    color: pnl >= 0 ? "#00FF88" : "#FF3B5C" }}>{pnl >= 0 ? "+" : ""}${pnl}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ textAlign: "center", marginTop: "4px", color: "#607080", fontSize: "8px" }}>{expanded ? "▲" : "▼"}</div>
    </div>
  );
}

// Calendar grid — month view, each day shows trade count + P&L
function CalendarView({ records, onSelectDay, selectedDay }) {
  const [calMonth, setCalMonth] = useState(new Date());

  const year  = calMonth.getFullYear();
  const month = calMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Group records by YYYY-MM-DD
  const byDay = {};
  records.forEach(r => {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
    if (!byDay[key]) byDay[key] = [];
    byDay[key].push(r);
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dayKey = (d) => `${year}-${String(month+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;

  const prevMonth = () => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setCalMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  return (
    <div style={{ padding: "0 12px 8px" }}>
      {/* Month nav */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <button onClick={prevMonth} style={{ background: "none", border: "none", color: "#00E5FF", fontSize: "18px", cursor: "pointer" }}>‹</button>
        <span style={{ fontFamily: "'Orbitron',monospace", fontSize: "12px", color: "#00E5FF", letterSpacing: ".1em" }}>
          {MONTHS[month]} {year}
        </span>
        <button onClick={nextMonth} style={{ background: "none", border: "none", color: "#00E5FF", fontSize: "18px", cursor: "pointer" }}>›</button>
      </div>

      {/* Day headers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px", marginBottom: "4px" }}>
        {DAYS.map(d => (
          <div key={d} style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px",
            color: "#607080", textAlign: "center", padding: "2px 0" }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px" }}>
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const key   = dayKey(d);
          const trades = byDay[key] || [];
          const pnl   = trades.reduce((s, r) => s + tradeMove(r), 0);
          const isSelected = selectedDay === key;
          const isToday = new Date().toDateString() === new Date(year, month, d).toDateString();
          const hasTrades = trades.length > 0;

          return (
            <div key={key} onClick={() => hasTrades && onSelectDay(isSelected ? null : key)}
              style={{
                background: isSelected ? "rgba(0,229,255,0.12)" : hasTrades
                  ? (pnl >= 0 ? "rgba(0,255,136,0.06)" : "rgba(255,59,92,0.06)")
                  : "rgba(255,255,255,0.02)",
                border: isSelected ? "1px solid rgba(0,229,255,0.5)"
                  : isToday ? "1px solid rgba(0,229,255,0.3)"
                  : hasTrades ? `1px solid ${pnl >= 0 ? "rgba(0,255,136,0.2)" : "rgba(255,59,92,0.2)"}` 
                  : "1px solid rgba(255,255,255,0.04)",
                borderRadius: "4px", padding: "4px 2px", minHeight: "44px",
                cursor: hasTrades ? "pointer" : "default",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
                gap: "2px", transition: "all 0.15s",
              }}>
              <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px",
                color: isToday ? "#00E5FF" : "#8A9AAA" }}>{d}</span>
              {hasTrades && (
                <>
                  <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px",
                    color: "#607080" }}>{trades.length}t</span>
                  <span style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", fontWeight: 700,
                    color: pnl >= 0 ? "#00FF88" : "#FF3B5C" }}>
                    {pnl >= 0 ? "+" : ""}{pnl.toFixed(1)}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function HistoryView() {
  const { state } = useApp();
  const [view, setView]           = useState("calendar"); // "calendar" | "list"
  const [selectedDay, setSelectedDay] = useState(null);

  const all = [...(state.history || [])];

  const wins   = all.filter(r => tradeMove(r) > 0).length;
  const losses = all.length - wins;
  const wr     = all.length > 0 ? Math.round(wins / all.length * 100) : 0;
  const weekPts = all
    .filter(r => new Date(r.date) > new Date(Date.now() - 7*86400e3))
    .reduce((s, r) => s + tradeMove(r), 0);

  // Trades shown: if a day is selected → that day's trades, else all
  const shown = selectedDay
    ? all.filter(r => {
        const d = new Date(r.date);
        const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        return key === selectedDay;
      })
    : all;

  const dayTotal = selectedDay
    ? shown.reduce((s, r) => s + tradeMove(r), 0)
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", background: "#0A0D12" }}>
      {/* Header */}
      <div style={{ padding: "10px 14px 6px", flexShrink: 0, borderBottom: "1px solid rgba(0,229,255,0.08)",
        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "13px", color: "#00E5FF", letterSpacing: ".15em" }}>
            ◎ SIGNAL HISTORY
          </div>
          <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#607080", marginTop: "1px" }}>
            AUTO-LOGGED · PERSISTENT
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px" }}>
          {["calendar","list"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "4px 10px", borderRadius: "3px", cursor: "pointer",
              border: view === v ? "1px solid #00E5FF" : "1px solid rgba(0,229,255,0.2)",
              background: view === v ? "rgba(0,229,255,0.1)" : "transparent",
              color: view === v ? "#00E5FF" : "#607080",
              fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", letterSpacing: ".05em",
            }}>{v === "calendar" ? "📅" : "≡ LIST"}</button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div style={{ flexShrink: 0, display: "flex", gap: "1px", background: "rgba(0,229,255,0.04)",
        borderBottom: "1px solid rgba(0,229,255,0.06)" }}>
        {[
          { v: wins,   l: "WINS",     c: "#00FF88" },
          { v: losses, l: "LOSSES",   c: "#FF3B5C" },
          { v: wr+"%", l: "WIN RATE", c: wr >= 50 ? "#00FF88" : "#FF3B5C" },
          { v: (weekPts >= 0 ? "+" : "")+weekPts.toFixed(1), l: "7D PTS", c: weekPts >= 0 ? "#D4AF37" : "#FF3B5C" },
        ].map(s => (
          <div key={s.l} style={{ flex: 1, background: "#0D1117", padding: "7px 0", textAlign: "center" }}>
            <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "14px", fontWeight: 700, color: s.c }}>{s.v}</div>
            <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "7px", color: "#607080", marginTop: "1px" }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
        {/* Calendar view */}
        {view === "calendar" && (
          <CalendarView records={all} onSelectDay={setSelectedDay} selectedDay={selectedDay} />
        )}

        {/* Selected day banner */}
        {selectedDay && (
          <div style={{ margin: "0 12px 8px", padding: "8px 12px",
            background: dayTotal >= 0 ? "rgba(0,255,136,0.06)" : "rgba(255,59,92,0.06)",
            border: `1px solid ${dayTotal >= 0 ? "rgba(0,255,136,0.25)" : "rgba(255,59,92,0.25)"}`,
            borderRadius: "5px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "10px", color: "#8A9AAA" }}>
                {new Date(selectedDay).toLocaleDateString(undefined, { weekday:"long", month:"short", day:"numeric" })}
              </div>
              <div style={{ fontFamily: "'Share Tech Mono',monospace", fontSize: "9px", color: "#607080", marginTop: "2px" }}>
                {shown.length} signal{shown.length !== 1 ? "s" : ""}
              </div>
            </div>
            <div>
              <div style={{ fontFamily: "'Orbitron',monospace", fontSize: "16px", fontWeight: 700,
                color: dayTotal >= 0 ? "#00FF88" : "#FF3B5C" }}>
                {dayTotal >= 0 ? "+" : ""}{dayTotal?.toFixed(2)} pts
              </div>
              <button onClick={() => setSelectedDay(null)} style={{
                background: "none", border: "none", color: "#607080",
                fontFamily: "'Share Tech Mono',monospace", fontSize: "8px", cursor: "pointer", marginTop: "2px",
              }}>✕ CLEAR</button>
            </div>
          </div>
        )}

        {/* Trade list */}
        <div style={{ padding: "0 12px 12px" }}>
          {shown.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px",
              fontFamily: "'Share Tech Mono',monospace", fontSize: "11px", color: "#607080" }}>
              {selectedDay ? "No trades on this day" : "No signals yet — connect to start logging"}
            </div>
          ) : (
            shown.map((r, i) => <SignalCard key={r.id || i} record={r} />)
          )}
        </div>
      </div>
    </div>
  );
}
