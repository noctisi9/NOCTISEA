import { useApp } from "../../context/AppContext";

export default function DashboardTabBar() {
  const { state, dispatch } = useApp();

  return (
    <div className="tab-bar">
      <button
        className={`tab-btn ${state.currentView === "signals" ? "tab-active" : ""}`}
        onClick={() => dispatch({ type: "SET_VIEW", payload: "signals" })}
      >
        <span className="tab-icon">◈</span> Signal Provider
      </button>
      <button
        className={`tab-btn ${state.currentView === "autotrader" ? "tab-active" : ""}`}
        onClick={() => dispatch({ type: "SET_VIEW", payload: "autotrader" })}
      >
        <span className="tab-icon">⚙</span> Auto Trader
      </button>
    </div>
  );
}
