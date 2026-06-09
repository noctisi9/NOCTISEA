import { useEffect, useRef, useState } from "react";

export default function LandingPage({ navigate }) {
  const [sliding, setSliding] = useState(false);
  const [slideX, setSlideX] = useState(0);
  const sliderRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const THRESHOLD = 220;

  const onPointerDown = (e) => {
    isDragging.current = true;
    startX.current = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
  };
  const onPointerMove = (e) => {
    if (!isDragging.current) return;
    const x = (e.clientX ?? e.touches?.[0]?.clientX ?? startX.current) - startX.current;
    setSlideX(Math.max(0, Math.min(x, THRESHOLD)));
  };
  const onPointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (slideX >= THRESHOLD - 10) {
      setSliding(true);
      setTimeout(() => navigate("/dashboard"), 400);
    } else {
      setSlideX(0);
    }
  };

  return (
    <div style={{
      width: "100%", height: "100%", background: "#0A0A0A",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "flex-end",
      padding: "0 0 56px 0", position: "relative", overflow: "hidden",
      fontFamily: "'Rajdhani', sans-serif",
    }}>

      {/* Background grid */}
      <div style={{
        position: "absolute", inset: 0, zIndex: 0,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.03) 1px,transparent 1px)",
        backgroundSize: "32px 32px",
      }} />

      {/* Top brand mark */}
      <div style={{
        position: "absolute", top: 64, left: 0, right: 0,
        display: "flex", flexDirection: "column", alignItems: "center", zIndex: 2,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: "50%",
          border: "1px solid rgba(255,255,255,0.15)",
          display: "flex", alignItems: "center", justifyContent: "center",
          marginBottom: 20,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, color: "#fff",
          }}>Z</div>
        </div>
        <div style={{
          fontFamily: "'Orbitron', monospace", fontSize: "clamp(36px,10vw,52px)",
          fontWeight: 900, letterSpacing: "0.18em", color: "#FFFFFF",
          marginBottom: 8,
        }}>ZENON IV</div>
        <div style={{
          fontFamily: "'Share Tech Mono', monospace", fontSize: 11,
          color: "rgba(255,255,255,0.35)", letterSpacing: "0.4em",
          textTransform: "uppercase",
        }}>Synthetic Intelligence</div>
      </div>

      {/* Center tagline */}
      <div style={{
        position: "absolute", top: "42%", left: 32, right: 32,
        zIndex: 2, textAlign: "left",
      }}>
        <div style={{
          fontSize: "clamp(28px,8vw,40px)", fontWeight: 700,
          color: "#FFFFFF", lineHeight: 1.15, marginBottom: 12,
        }}>
          Trading<br />made<br />precise.
        </div>
        <div style={{
          fontSize: 13, color: "rgba(255,255,255,0.4)",
          fontFamily: "'Share Tech Mono', monospace", letterSpacing: "0.05em",
        }}>
          Boom &amp; Crash signals at your fingertips.
        </div>
      </div>

      {/* Buttons */}
      <div style={{ position: "relative", zIndex: 2, width: "100%", padding: "0 28px", display: "flex", flexDirection: "column", gap: 12 }}>

        {/* Continue button */}
        <button
          onClick={() => navigate("/dashboard")}
          style={{
            width: "100%", padding: "17px 0",
            background: "#FFFFFF", color: "#0A0A0A",
            border: "none", borderRadius: 48,
            fontSize: 15, fontWeight: 700,
            fontFamily: "'Rajdhani', sans-serif", letterSpacing: "0.08em",
            cursor: "pointer",
          }}
        >
          Continue
        </button>

        {/* Slide to enter */}
        <div style={{
          width: "100%", height: 56, borderRadius: 48,
          background: "rgba(255,255,255,0.07)",
          border: "1px solid rgba(255,255,255,0.12)",
          position: "relative", overflow: "hidden", userSelect: "none",
        }}
          onMouseDown={onPointerDown}
          onMouseMove={onPointerMove}
          onMouseUp={onPointerUp}
          onMouseLeave={onPointerUp}
          onTouchStart={onPointerDown}
          onTouchMove={onPointerMove}
          onTouchEnd={onPointerUp}
        >
          {/* Track label */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontFamily: "'Share Tech Mono', monospace", fontSize: 12,
            color: "rgba(255,255,255,0.3)", letterSpacing: "0.15em",
            pointerEvents: "none",
          }}>
            Slide →
          </div>
          {/* Thumb */}
          <div style={{
            position: "absolute", left: 4, top: 4, bottom: 4,
            width: 48, borderRadius: 44,
            background: "#FFFFFF",
            transform: `translateX(${slideX}px)`,
            transition: isDragging.current ? "none" : "transform 0.3s ease",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, color: "#0A0A0A", fontWeight: 700,
            pointerEvents: "none",
          }}>›</div>
        </div>

      </div>
    </div>
  );
}
