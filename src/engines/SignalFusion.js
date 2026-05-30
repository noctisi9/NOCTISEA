/**
 * Signal Fusion Layer
 * Combines Engine 1 (AO/AC), Engine 2 (Orderflow), Engine 3 (Welford)
 * Outputs final NOCTIS signal
 */
export class SignalFusion {
  evaluate({ ao, ac, asset, orderflow, welford }) {
    // Engine 1: AO + AC zero-line alignment
    const aoNeg = ao < 0;
    const acNeg = ac < 0;
    const aoPos = ao > 0;
    const acPos = ac > 0;

    let e1Signal = null;
    if (asset === "BOOM_1000"  && aoNeg && acNeg) e1Signal = "SELL";
    if (asset === "CRASH_1000" && aoPos && acPos) e1Signal = "BUY";

    if (!e1Signal) return { signal: null, safe: false, reason: "No E1 alignment" };

    // Engine 2: No absorption barrier blocking path
    const e2Safe = !orderflow?.absorptionDetected;

    // Engine 3: No micro-compression (spike imminent)
    const e3Safe = !welford?.compressionWarning;

    const safe   = e2Safe && e3Safe;
    const signal = safe ? e1Signal : null;

    return {
      signal,
      safe,
      e1Signal,
      e2Safe,
      e3Safe,
      reason: !safe
        ? (!e2Safe ? "Absorption barrier detected" : "Micro-compression — spike risk")
        : "CLEAR TO SCALP",
    };
  }
}
