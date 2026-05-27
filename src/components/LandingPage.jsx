import { useEffect, useRef } from "react";
import { useApp } from "../context/AppContext";

export default function LandingPage({ navigate }) {
  const { requestNotificationPermission } = useApp();
  const canvasRef = useRef(null);

  useEffect(() => {
    requestNotificationPermission();
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const resize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const pts = Array.from({length: 60}, () => ({
      x: Math.random()*window.innerWidth, y: Math.random()*window.innerHeight,
      r: Math.random()*1.2+0.3, dx: (Math.random()-.5)*.4, dy: (Math.random()-.5)*.4,
      op: Math.random()*.4+.05,
    }));
    let id;
    const draw = () => {
      ctx.clearRect(0,0,c.width,c.height);
      pts.forEach(p => {
        ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle=`rgba(0,229,255,${p.op})`; ctx.fill();
        p.x+=p.dx; p.y+=p.dy;
        if(p.x<0||p.x>c.width) p.dx*=-1;
        if(p.y<0||p.y>c.height) p.dy*=-1;
      });
      id = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <div className="landing-root">
      <canvas ref={canvasRef} className="landing-canvas" />
      <div className="landing-grid-overlay" />
      <div className="landing-center">
        <div className="landing-logo-ring">
          <div className="landing-logo-inner"><span className="lhex">⬡</span></div>
        </div>
        <h1 className="landing-title">NOCTIS</h1>
        <p className="landing-subtitle">ITRADE XXIV</p>
        <div className="landing-divider" />
        <p className="landing-tagline">Precision · Automation · Dominance</p>
        <button className="landing-cta" onClick={() => navigate("/dashboard")}>
          <span className="cta-pulse" />
          <span>ENTER THE MARKETS</span>
          <span>→</span>
        </button>
        <p className="landing-version">v3.0.0 · Deriv WebSocket API</p>
      </div>
    </div>
  );
}
