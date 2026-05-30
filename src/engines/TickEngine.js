/**
 * Engine 3 Supplement: Tick Speed + Directional Counter
 * Tracks Hz, bull/bear tick counts, velocity
 */
export class TickEngine {
  constructor() {
    this.timestamps   = [];
    this.bullTicks    = 0;
    this.bearTicks    = 0;
    this.lastPrice    = 0;
    this.lastTime     = 0;
    this.velocities   = new Float64Array(100);
    this.velHead      = 0;
    this.velCount     = 0;
  }

  processTick(price) {
    const now = Date.now();
    // Rolling 1000ms window
    this.timestamps.push(now);
    const cutoff = now - 1000;
    while (this.timestamps.length && this.timestamps[0] < cutoff) {
      this.timestamps.shift();
    }
    const hz = this.timestamps.length;

    // Direction
    if (this.lastPrice > 0) {
      const diff = price - this.lastPrice;
      if (diff > 0) this.bullTicks++;
      else if (diff < 0) this.bearTicks++;

      // Velocity (price change per ms)
      const dt = now - this.lastTime;
      if (dt > 0) {
        const vel = Math.abs(diff) / dt;
        this.velocities[this.velHead] = vel;
        this.velHead  = (this.velHead + 1) % 100;
        this.velCount = Math.min(this.velCount + 1, 100);
      }
    }

    this.lastPrice = price;
    this.lastTime  = now;

    const totalTicks = this.bullTicks + this.bearTicks;
    const bullPct    = totalTicks > 0 ? (this.bullTicks / totalTicks * 100).toFixed(1) : 50;
    const bearPct    = totalTicks > 0 ? (this.bearTicks / totalTicks * 100).toFixed(1) : 50;

    // Average velocity
    let avgVel = 0;
    for (let i = 0; i < this.velCount; i++) avgVel += this.velocities[i];
    avgVel = this.velCount > 0 ? avgVel / this.velCount : 0;

    return { hz, bullTicks: this.bullTicks, bearTicks: this.bearTicks, bullPct, bearPct, avgVelocity: avgVel };
  }

  reset() {
    this.timestamps = []; this.bullTicks = 0; this.bearTicks = 0;
    this.lastPrice = 0; this.lastTime = 0;
    this.velHead = 0; this.velCount = 0;
  }
}
