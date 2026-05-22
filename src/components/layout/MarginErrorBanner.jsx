import { useApp } from "../../context/AppContext";

export default function MarginErrorBanner() {
  const { state, dispatch } = useApp();
  if (!state.marginError) return null;
  return (
    <div className="margin-error-banner">
      <div className="margin-error-icon">⚠</div>
      <div className="margin-error-body">
        <div className="margin-error-title">ABOVE LIMIT</div>
        <div className="margin-error-msg">{state.marginError}</div>
      </div>
      <button className="margin-error-close" onClick={() => dispatch({ type: "CLEAR_MARGIN_ERROR" })}>✕</button>
    </div>
  );
}
