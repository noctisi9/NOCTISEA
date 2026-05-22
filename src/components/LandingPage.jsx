import { useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";

export default function LandingPage({ navigate }) {
  const { requestNotificationPermission } = useApp();
  const particlesRef = useRef(null);

  useEffect(() => {
    requestNotificationPermission();
    const canvas = particlesRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.5 + 0.1,
    }));

    let animId;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212, 175, 55, ${p.opacity})`;
        ctx.fill();
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0 || p.x > canvas.width) p.dx *= -1;
        if (p.y < 0 || p.y > canvas.height) p.dy *= -1;
      });
      animId = requestAnimationFrame(draw);
    };
    draw();

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", resize);
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div className="landing-root">
      <canvas ref={particlesRef} className="landing-canvas" />
      <div className="landing-center">
        <div className="landing-logo-ring">
          <div className="landing-logo-inner">
            <span className="landing-hex">⬡</span>
          </div>
        </div>
        <h1 className="landing-title">NOCTIS EA</h1>
        <p className="landing-subtitle">ITRADE XXIV</p>
        <div className="landing-divider" />
        <p className="landing-tagline">Precision. Automation. Dominance.</p>
        <button className="landing-cta" onClick={() => navigate("/dashboard")}>
          <span className="cta-pulse" />
          <span className="cta-text">ENTER THE MARKETS</span>
          <span className="cta-arrow">→</span>
        </button>
        <p className="landing-version">v2.4.1 · Deriv WebSocket API</p>
      </div>
      <div className="landing-grid-overlay" />
    </div>
  );
}
