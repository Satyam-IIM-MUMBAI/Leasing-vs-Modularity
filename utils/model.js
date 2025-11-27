// utils/model.js
// Note: small deterministic grid-search replaces SciPy minimize for client-side.
// Exports: buildFig1Grid(params), buildJointChoiceGrid(params), buildGridResults(params)

function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

function CircularEconomyModel(d1, d2, gamma, c, k=0.0) {
  this.d1 = d1;
  this.d2 = d2;
  this.gamma = gamma;
  this.c = c;
  this.k = k;
  this.d1L = Math.min(gamma * d1, 0.999);
  this.d2L = Math.min(gamma * d2, 0.999);
  this.d_sum_S = d1 + d2;
  this.d_sum_L = this.d1L + this.d2L;
}

CircularEconomyModel.prototype.profit_SI = function() {
  const cost = 2 * this.c;
  if (cost > 1 + this.d_sum_S/2) return 0.0;
  const numerator = Math.pow(2 - 2*cost + this.d_sum_S, 2);
  const denominator = 8 * (2 + 3*this.d_sum_S);
  return numerator / denominator;
};

// simple grid-based numeric optimization for LI
CircularEconomyModel.prototype._optimize_LI_numerical = function() {
  const dsum = this.d_sum_L;
  const cost = 2 * this.c;
  let best = 0;
  const steps = 31;
  for (let i=0;i<steps;i++){
    const Ln = i/(steps-1);
    for (let j=0;j<steps;j++){
      const Lu = j/(steps-1);
      if (Lu > Ln) continue;
      const rn = 1 - Ln - (dsum/2)*Lu;
      const ru = (dsum/2)*(1 - Ln - Lu);
      if (rn < 0 || ru < 0) continue;
      const profit = (rn*Ln + ru*Lu) - cost*Ln;
      if (profit > best) best = profit;
    }
  }
  return best;
};

CircularEconomyModel.prototype.profit_LI = function() {
  const cost = 2 * this.c;
  const CLI = (2 - this.d_sum_L) / 8.0;
  if (this.c < CLI) return this._optimize_LI_numerical();
  const numerator = Math.pow(2 - 2*cost + this.d_sum_L, 2);
  const denominator = 8 * (2 + 3*this.d_sum_L);
  return numerator / denominator;
};

CircularEconomyModel.prototype.profit_SM = function() {
  const c_mod = this.c;
  const margin2 = 1 - 2*c_mod - this.d2 - this.k;
  const pi2 = margin2 <= 0 ? 0 : Math.pow(margin2,2)/(8*(1-this.d2));
  const margin1 = 1 - 2*c_mod - this.k + 2*this.d2 + this.d1;
  const pi1 = margin1 <= 0 ? 0 : Math.pow(margin1,2)/(8*(1 + 3*this.d1 + 4*this.d2));
  const pi_modular = pi1 + pi2;
  const pi_integral = this.profit_SI();
  return Math.max(pi_integral, pi_modular);
};

// LM: small grid search for Lnn, Lun, Luu subject to Lun+Luu <= Lnn
CircularEconomyModel.prototype.profit_LM = function() {
  const steps = 21;
  let best = 0;
  for (let i=0;i<steps;i++){
    const Lnn = i/(steps-1);
    for (let j=0;j<steps;j++){
      const Lun = j/(steps-1);
      for (let kidx=0;kidx<steps;kidx++){
        const Luu = kidx/(steps-1);
        if (Lun + Luu > Lnn) continue;
        const Q = Lnn + Lun + Luu;
        if (Q>=1) continue;
        const u_nn = 1.0;
        const u_un = (1.0 + this.d1L)/2.0;
        const u_uu = (this.d1L + this.d2L)/2.0;
        const ruu = u_uu * (1 - Q);
        const run = ruu + (u_un - u_uu) * (1 - Lnn - Lun);
        const rnn = run + (1.0 - u_un) * (1 - Lnn);
        const revenue = rnn*Lnn + run*Lun + ruu*Luu;
        const c_nn = 2*this.c + this.k;
        const c_un = this.c + this.k;
        const c_uu = this.k;
        const cost = c_nn*Lnn + c_un*Lun + c_uu*Luu;
        const profit = revenue - cost;
        if (profit > best) best = profit;
      }
    }
  }
  const pi_LI = this.profit_LI();
  return Math.max(best, pi_LI);
};

// Helper: build a grid for fig1 (modular vs integral)
export function buildFig1Grid({ d1, d2, gamma, c, k, resolution }) {
  // We'll plot region: for many (d1,d2) check which architecture wins for chosen gamma,c
  const N = resolution || 40;
  const xs = new Array(N).fill(0).map((_,i) => 0.05 + (0.95-0.05)*(i/(N-1)));
  const ys = new Array(N).fill(0).map((_,i) => 0.05 + (0.95-0.05)*(i/(N-1)));
  const Z = Array.from({length:N}, ()=> new Array(N).fill(0));
  for (let i=0;i<N;i++){
    for (let j=0;j<N;j++){
      const dd1 = xs[j], dd2 = ys[i];
      if (dd2 >= dd1) { Z[i][j] = NaN; continue; }
      const m = new CircularEconomyModel(dd1, dd2, gamma, c, k);
      // Compare modular vs integral under SELLING (simulate behavior used earlier)
      const pi_mod = m.profit_SM();
      const pi_int = m.profit_SI();
      Z[i][j] = (pi_mod > pi_int + 1e-6) ? 1 : 0;
    }
  }
  return { Z, xAxis: xs, yAxis: ys, title: "Figure 1: Modular(1) vs Integral(0)", colors: [['white','lightgray']] };
}

// Joint choice grid (Figure 4 style): pick best among SI,LI,SM,LM
export function buildJointChoiceGrid({ d1, d2, gamma, c, k, resolution }) {
  const N = resolution || 40;
  const c_range = new Array(N).fill(0).map((_,i) => 0.01 + (0.35-0.01)*(i/(N-1)));
  const g_range = new Array(N).fill(0).map((_,i) => 0.5 + (1.5-0.5)*(i/(N-1)));
  const Z = Array.from({length:N}, ()=> new Array(N).fill(0));
  for (let i=0;i<N;i++){
    for (let j=0;j<N;j++){
      const cval = c_range[j], gval = g_range[i];
      const m = new CircularEconomyModel(d1, d2, gval, cval, k);
      const profits = [m.profit_SI(), m.profit_LI(), m.profit_SM(), m.profit_LM()];
      const bestIdx = profits.indexOf(Math.max(...profits));
      Z[i][j] = bestIdx; // 0..3
    }
  }
  return { Z, xAxis: c_range, yAxis: g_range, title: "Figure 4: Joint Choice (0=SI,1=LI,2=SM,3=LM)" };
}

// Single point profits (table)
export function buildGridResults({ d1, d2, gamma, c, k }) {
  const m = new CircularEconomyModel(d1, d2, gamma, c, k);
  const singleProfits = {
    SI: m.profit_SI(),
    LI: m.profit_LI(),
    SM: m.profit_SM(),
    LM: m.profit_LM()
  };
  return { singleProfits, Z: [[0]], xAxis: [0], yAxis: [0], title: 'Profits' };
}
