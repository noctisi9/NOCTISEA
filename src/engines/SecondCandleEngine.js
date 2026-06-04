/**
 * SecondCandleEngine
 * Builds synthetic 1-second OHLC candles from raw ticks.
 * No 1-second candle feed exists on Deriv — we build our own.
 * Each candle = all ticks within the same UTC second.
 * tickCount = volume proxy.
 */
export class SecondCandleEngine {
  constructor(maxCandles = 120) {
    this.maxCandles  = maxCandles;
    this.candles     = [];       // completed 1s candles
    this.current     = null;     // building candle
    this.lastPrice   = 0;
    this.spikeThreshold = 0;     // adaptive spike detection
    this.recentSpikes   = 0;
    this.spikeWindow    = [];    // timestamps of last spikes
    this.lvd            = 0;     // Liquidity Void Depth
    this.lvdDecay       = 0.99;
  }

  processTick(price, timestamp = Date.now()) {
    const second = Math.floor(timestamp / 1000);

    // Detect spike (price jump > adaptive threshold)
    let isSpike = false;
    if (this.lastPrice > 0) {
      const move = Math.abs(price - this.lastPrice);
      if (this.spikeThreshold === 0) this.spikeThreshold = move * 3;
      else this.spikeThreshold = this.spikeThreshold * 0.995 + move * 0.005; // adaptive EMA
      isSpike = move > this.spikeThreshold * 2.5;

      // LVD update
      const isBearish = price < this.lastPrice;
      this.lvd = this.lvd * this.lvdDecay; // decay each tick
      if (isBearish && !isSpike) {
        this.lvd += move; // accumulate sell pressure
      }
      if (isSpike) {
        this.lvd = Math.max(0, this.lvd - move * 2); // spike resets LVD
      }
    }

    // Track recent spikes (rolling 10-candle window)
    if (isSpike) {
      this.spikeWindow.push(second);
      const cutoff = second - 10;
      this.spikeWindow = this.spikeWindow.filter(s => s >= cutoff);
    }
    this.recentSpikes = this.spikeWindow.length;

    // Build 1-second candle
    if (!this.current || this.current.second !== second) {
      // Close previous candle
      if (this.current) {
        this.candles.push({ ...this.current });
        if (this.candles.length > this.maxCandles) this.candles.shift();
      }
      // Open new candle
      this.current = {
        second,
        open:      price,
        high:      price,
        low:       price,
        close:     price,
        tickCount: 1,
        isSpike:   isSpike,
      };
    } else {
      // Update current candle
      this.current.high      = Math.max(this.current.high, price);
      this.current.low       = Math.min(this.current.low, price);
      this.current.close     = price;
      this.current.tickCount += 1;
      if (isSpike) this.current.isSpike = true;
    }

    this.lastPrice = price;

    return {
      candles:      this.candles,
      current:      this.current,
      lvd:          this.lvd,
      recentSpikes: this.recentSpikes,
      isSpike,
    };
  }

  // Classify the market phase
  getPhase() {
    if (this.recentSpikes >= 3) return "HOT";
    if (this.lvd > 1.5)         return "COOL";
    return "NORMAL";
  }

  reset() {
    this.candles = []; this.current = null; this.lastPrice = 0;
    this.spikeThreshold = 0; this.recentSpikes = 0;
    this.spikeWindow = []; this.lvd = 0;
  }
}
