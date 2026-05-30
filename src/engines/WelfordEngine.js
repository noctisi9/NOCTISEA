/**
 * Engine 3: Welford Rolling Standard Deviation
 * O(1) time complexity using pre-allocated Float64Array ring buffer
 */
export class WelfordRollingEngine {
  constructor(windowSize = 1000) {
    this.windowSize = windowSize;
    this.history    = new Float64Array(windowSize);
    this.head       = 0;
    this.count      = 0;
    this.mean       = 0.0;
    this.M2         = 0.0;
    // Long-run baseline for compression detection
    this.sigmaHistory = new Float64Array(200);
    this.sigmaHead    = 0;
    this.sigmaCount   = 0;
    this.sigmaMean    = 0.0;
    this.sigmaM2      = 0.0;
  }

  update(x) {
    if (this.count < this.windowSize) {
      this.count++;
      const delta  = x - this.mean;
      this.mean   += delta / this.count;
      const delta2 = x - this.mean;
      this.M2     += delta * delta2;
      this.history[this.head] = x;
      this.head = (this.head + 1) % this.windowSize;
    } else {
      const xOld    = this.history[this.head];
      const dOld    = xOld - this.mean;
      this.mean     = (this.windowSize * this.mean - xOld) / (this.windowSize - 1);
      const dOld2   = xOld - this.mean;
      this.M2      -= dOld * dOld2;
      const dNew    = x - this.mean;
      this.mean    += dNew / this.windowSize;
      const dNew2   = x - this.mean;
      this.M2      += dNew * dNew2;
      this.history[this.head] = x;
      this.head = (this.head + 1) % this.windowSize;
    }
    if (this.M2 < 0) this.M2 = 0;
    const variance = this.count > 1 ? this.M2 / this.count : 0;
    const stdDev   = Math.sqrt(variance);

    // Track sigma history for compression detection
    this._updateSigma(stdDev);
    const compressionWarning = this._detectCompression(stdDev);

    return { mean: this.mean, variance, stdDev, compressionWarning };
  }

  _updateSigma(sigma) {
    if (this.sigmaCount < 200) this.sigmaCount++;
    const xOld = this.sigmaCount >= 200 ? this.sigmaHistory[this.sigmaHead] : 0;
    if (this.sigmaCount >= 200) {
      const dOld   = xOld - this.sigmaMean;
      this.sigmaMean = (200 * this.sigmaMean - xOld) / 199;
      this.sigmaM2  -= dOld * (xOld - this.sigmaMean);
    }
    const dNew = sigma - this.sigmaMean;
    this.sigmaMean += dNew / Math.min(this.sigmaCount, 200);
    this.sigmaM2   += dNew * (sigma - this.sigmaMean);
    this.sigmaHistory[this.sigmaHead] = sigma;
    this.sigmaHead = (this.sigmaHead + 1) % 200;
    if (this.sigmaM2 < 0) this.sigmaM2 = 0;
  }

  _detectCompression(currentSigma) {
    if (this.sigmaCount < 50) return false;
    const sigmaVariance = this.sigmaM2 / this.sigmaCount;
    const sigmaSd       = Math.sqrt(sigmaVariance);
    // Compression: sigma drops 2 std devs below its own rolling mean
    return currentSigma < (this.sigmaMean - 2 * sigmaSd);
  }

  reset() {
    this.head = 0; this.count = 0;
    this.mean = 0; this.M2 = 0;
  }
}
