// Standard normal CDF using error function approximation
const normCdf = (x) => 0.5 * (1 + Math.erf(x / Math.sqrt(2)));

// Standard normal inverse CDF (probit) using approximation
const normInv = (p) => {
  if (p <= 0 || p >= 1) throw new Error('Invalid p for normInv');
  const a1 = -39.6968302866538, a2 = 220.946098424521, a3 = -275.928510446969;
  const a4 = 138.357751867269, a5 = -30.6647980661472, a6 = 2.50662827745924;
  const b1 = -54.4760987982241, b2 = 161.585836858041, b3 = -155.698979859887;
  const b4 = 66.8013118877197, b5 = -13.2806815528857;
  const c1 = -0.00778489400243029, c2 = -0.322396458041136, c3 = -2.40075827716184;
  const c4 = -2.54973253934373, c5 = 4.37466414146497, c6 = 2.93816398269878;
  const d1 = 0.00778469570904146, d2 = 0.32246712907004, d3 = 2.445134137143;
  const d4 = 3.75440866190742;
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q, r;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a1 * r + a2) * r + a3) * r + a4) * r + a5) * r + a6) * q /
      (((((b1 * r + b2) * r + b3) * r + b4) * r + b5) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c1 * q + c2) * q + c3) * q + c4) * q + c5) * q + c6) /
      ((((d1 * q + d2) * q + d3) * q + d4) * q + 1);
  }
};

// Vasicek PIT PD formula
const vasicekPitPd = (ttcPd, rho, z) => {
  const inv = normInv(ttcPd);
  const arg = (inv - Math.sqrt(rho) * z) / Math.sqrt(1 - rho);
  return normCdf(arg);
};

// Compute z-score from MEVs and coefficients
const computeZ = (mev, coefficients) => {
  let z = 0;
  for (const [k, v] of Object.entries(coefficients)) {
    z += (mev[k] || 0) * v;
  }
  return z;
};

// Main method: compute PIT PD matrix
const computePitPdMatrix = (ttcMatrix, mev, coefficients) => {
  const rho = 0.15; // Example: could be parameterized or per-segment
  const z = computeZ(mev, coefficients);
  return ttcMatrix.map(row => ({
    portfolio: row.portfolio,
    product: row.product,
    risk_band: row.risk_band,
    pit_buckets: row.buckets.map(ttc_pd => vasicekPitPd(ttc_pd, rho, z)),
  }));
};

// Polyfill for Math.erf if not present
if (!Math.erf) {
  Math.erf = function(x) {
    const sign = (x >= 0) ? 1 : -1;
    x = Math.abs(x);
    const a1 =  0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return sign * y;
  };
}

module.exports = {
  computePitPdMatrix,
  normCdf,
  normInv,
  vasicekPitPd,
  computeZ
};
