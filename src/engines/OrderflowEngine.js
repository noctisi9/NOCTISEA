/**
 * Engine 2: Spatial Orderflow Matrix
 * Maps ticks into price bins, tracks volume delta
 */
export class SyntheticOrderflowMatrix {
  constructor(tickSize = 0.01, memoryLimit = 500) {
    this.tickSize  = tickSize;
    this.matrix    = new Map();
    this.memoryLimit = memoryLimit;
    this.currentPrice  = 0;
    this.previousPrice = 0;
    this.cumulativeDelta = 0;
    this.totalVolume     = 0;
    this.pocLevel        = 0; // Point of Control
    this.maxVolume       = 0;
  }

  processTick(price) {
    this.previousPrice = this.currentPrice;
    this.currentPrice  = price;
    if (!this.previousPrice) return null;

    const level = (Math.round(price / this.tickSize) * this.tickSize).toFixed(4);
    if (!this.matrix.has(level)) {
      this.matrix.set(level, { volume: 0, delta: 0, tUp: 0, tDown: 0 });
    }

    const node = this.matrix.get(level);
    node.volume++;
    this.totalVolume++;

    if (this.currentPrice > this.previousPrice) {
      node.tUp++;
      node.delta++;
      this.cumulativeDelta++;
    } else if (this.currentPrice < this.previousPrice) {
      node.tDown++;
      node.delta--;
      this.cumulativeDelta--;
    }

    // Update POC
    if (node.volume > this.maxVolume) {
      this.maxVolume = node.volume;
      this.pocLevel  = parseFloat(level);
    }

    // Memory management
    if (this.matrix.size > this.memoryLimit) {
      const oldest = this.matrix.keys().next().value;
      this.matrix.delete(oldest);
    }

    return this.getState();
  }

  getState() {
    return {
      pocLevel:            this.pocLevel,
      cumulativeDelta:     this.cumulativeDelta,
      totalVolume:         this.totalVolume,
      absorptionDetected:  this._checkAbsorption(),
      profile:             this._getProfile(),
    };
  }

  _checkAbsorption() {
    if (!this.pocLevel || this.totalVolume < 50) return false;
    const nearPoc = Array.from(this.matrix.entries()).filter(([k]) =>
      Math.abs(parseFloat(k) - this.pocLevel) <= this.tickSize * 3
    );
    const pocVolume = nearPoc.reduce((s, [, v]) => s + v.volume, 0);
    return pocVolume / this.totalVolume > 0.3;
  }

  _getProfile() {
    const entries = Array.from(this.matrix.entries())
      .map(([price, data]) => ({ price: parseFloat(price), ...data }))
      .sort((a, b) => b.price - a.price);
    return entries;
  }

  reset() {
    this.matrix.clear();
    this.currentPrice = 0; this.previousPrice = 0;
    this.cumulativeDelta = 0; this.totalVolume = 0;
    this.pocLevel = 0; this.maxVolume = 0;
  }
}
