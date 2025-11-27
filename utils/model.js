// utils/model.js
// JS port of the CircularEconomyModel and grid builders for Fig1..Fig6
// Deterministic grid-search approximations (client-side friendly).

function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }

export function CircularEconomyModel(d1, d2, gamma, c, k=0.0) {
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

CircularEconomyModel.prototype._optimize_LI_numerical = function() {
  // small deterministic grid search for Ln, Lu
  const dsum = this.d_sum_L;
  const cost = 2 * this.c;
  let best = -1e9;
  const S = 25;
  for (let i=0;i<S;i++){
    const Ln = i/(S-1);
    for (let j=0;j<S;j++){
      const Lu = j/(S-1);
      if (Lu > Ln) continue;
      const rn = 1 - Ln - (dsum/2)*Lu;
      const ru = (dsum/2)*(1 - Ln - Lu);
      const profit = (rn*Ln + ru*Lu) - cost*Ln;
      if (profit > best) best = profit;
    }
  }
  return Math.max(best, 0);
};

CircularEconomyModel.prototype.profit_LI = function() {
  const CLI = (2 - this.d_sum_L) / 8.0;
  if (this.c < CLI) return this._optimize_LI_numerical();
  const numerator = Math.pow(2 - 2*(2*this.c) + this.d_sum_L, 2);
  const denominator = 8 * (2 + 3*this.d_sum_L);
  // note: original uses cost = 2*c inside numerator; kept consistent with profit_SI form
  const cost = 2 * this.c;
  return Math.pow(2 - 2*cost + this.d_sum_L, 2) / (8 * (2 + 3*this.d_sum_L));
};

CircularEconomyModel.prototype.profit_SM = function() {
  const c_mod = this.c;
  const margin2 = 1 - 2*c_mod - this.d2 - this.k;
  const pi2 = margin2 <= 0 ? 0 : Math.pow(margin2,2) / (8 * (1 - this.d2));
  const margin1 = 1 - 2*c_mod - this.k + 2*this.d2 + this.d1;
  const pi1 = margin1 <= 0 ? 0 : Math.pow(margin1,2) / (8 * (1 + 3*this.d1 + 4*this.d2));
  const pi_modular = pi1 + pi2;
  const pi_integral = this.profit_SI();
  return Math.max(pi_integral, pi_modular);
};

CircularEconomyModel.prototype.profit_LM = function() {
  // deterministic grid search for Lnn, Lun, Luu
  const steps = 16;
  let best = -1e9;
  for (let i=0;i<steps;i++){
    const Lnn = i/(steps-1);
    for (let j=0;j<steps;j++){
      const Lun = j/(steps-1);
      for (let kidx=0;kidx<steps;kidx++){
        const Luu = kidx/(steps-1);
        if (Lun + Luu > Lnn) continue;
        const Q = Lnn + Lun + Luu;
        if (Q >= 1) continue;
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
  return Math.max(best, pi_LI, 0);
};

// ---------------- Grid builders ----------------

// Helper to make axis arrays
function linspace(a,b,n){
  const out = new Array(n);
  for (let i=0;i<n;i++) out[i] = a + (b-a)*(i/(n-1));
  return out;
}

// FIG 1: returns sell matrix and lease matrix (each N x N), axes xAxis (d1), yAxis (d2)
// Values: 0 => Integral better, 1 => Modular better, null => infeasible (d2 >= d1)
export function buildFig1Grid({ d1, d2, gamma, c, k, resolution }) {
  const N = resolution || 60;
  const xAxis = linspace(0.05, 0.95, N); // d1
  const yAxis = linspace(0.05, 0.95, N); // d2
  const Z_sell = Array.from({length:N}, ()=> new Array(N).fill(null));
  const Z_leas = Array.from({length:N}, ()=> new Array(N).fill(null));
  for (let i=0;i<N;i++){
    for (let j=0;j<N;j++){
      const d2v = yAxis[i];
      const d1v = xAxis[j];
      if (d2v >= d1v) { Z_sell[i][j] = null; Z_leas[i][j] = null; continue; }
      const m = new CircularEconomyModel(d1v, d2v, gamma, c, k);
      Z_sell[i][j] = (m.profit_SM() > m.profit_SI() + 1e-8) ? 1 : 0;
      Z_leas[i][j] = (m.profit_LM() > m.profit_LI() + 1e-8) ? 1 : 0;
    }
  }
  return { Z_sell, Z_leas, xAxis, yAxis, title: 'Architecture Choice (Fig 1)' };
}

// FIG 2: Architecture switching (Selling -> Leasing). Returns Z with categories 0..3 as per Python.
export function buildFig2Grid({ resolution=50, c=0.15 }) {
  const N = resolution || 50;
  const xAxis = linspace(0.05, 0.95, N);
  const yAxis = linspace(0.05, 0.95, N);
  const gammas = [0.8, 1.2];
  // We'll return an object with two grids (one per gamma)
  const results = [];
  for (const gamma of gammas){
    const Z = Array.from({length:N}, ()=> new Array(N).fill(null));
    for (let i=0;i<N;i++){
      for (let j=0;j<N;j++){
        const d2v = yAxis[i];
        const d1v = xAxis[j];
        if (d2v >= d1v){ Z[i][j] = null; continue; }
        const m = new CircularEconomyModel(d1v, d2v, gamma, c, 0.0);
        const arch_S = (m.profit_SM() > m.profit_SI()) ? 1 : 0;
        const arch_L = (m.profit_LM() > m.profit_LI()) ? 1 : 0;
        let res;
        if (arch_S === 0 && arch_L === 0) res = 0;
        else if (arch_S === 0 && arch_L === 1) res = 1;
        else if (arch_S === 1 && arch_L === 0) res = 2;
        else res = 3;
        Z[i][j] = res;
      }
    }
    results.push({ gamma, Z });
  }
  return { results, xAxis, yAxis, title: 'Architecture Switching (Fig 2)' };
}

// FIG 3: Business Model Choice (cost c vs gamma) for a fixed d1,d2
export function buildFig3Grid({ resolution=50, d1=0.5, d2=0.1 }) {
  const N = resolution || 50;
  const cAxis = linspace(0.01, 0.15, N);
  const gAxis = linspace(0.5, 1.3, N);
  const Z_int = Array.from({length:N}, ()=> new Array(N).fill(null));
  const Z_mod = Array.from({length:N}, ()=> new Array(N).fill(null));
  const Z_switch = Array.from({length:N}, ()=> new Array(N).fill(null));
  for (let i=0;i<N;i++){
    for (let j=0;j<N;j++){
      const cval = cAxis[j];
      const gval = gAxis[i];
      const m = new CircularEconomyModel(d1, d2, gval, cval, 0.0);
      const pi_LI = m.profit_LI();
      const pi_SI = m.profit_SI();
      Z_int[i][j] = (pi_LI > pi_SI) ? 1 : 0;
      const pi_LM = m.profit_LM();
      const pi_SM = m.profit_SM();
      Z_mod[i][j] = (pi_LM > pi_SM) ? 1 : 0;
      const pref_I = (pi_LI > pi_SI) ? 'L' : 'S';
      const pref_M = (pi_LM > pi_SM) ? 'L' : 'S';
      if (pref_I === 'L' && pref_M === 'S') Z_switch[i][j] = 1;
      else if (pref_I === pref_M) Z_switch[i][j] = (pref_M === 'L') ? 2 : 0;
      else Z_switch[i][j] = 0;
    }
  }
  return { Z_int, Z_mod, Z_switch, cAxis, gAxis, title: 'Business Model Choice (Fig 3)' };
}

// FIG 4: Joint choice map (SI, LI, SM, LM) for two cases of d1,d2
export function buildFig4Grid({ resolution=60 }) {
  const N = resolution || 60;
  const cAxis = linspace(0.01, 0.35, N);
  const gAxis = linspace(0.5, 1.5, N);
  const cases = [
    { d1: 0.28, d2: 0.1, name: 'High Diff (δ2=0.1)' },
    { d1: 0.20, d2: 0.18, name: 'Low Diff (δ2=0.18)' }
  ];
  const results = [];
  for (const cs of cases){
    const Z = Array.from({length:N}, ()=> new Array(N).fill(null));
    for (let i=0;i<N;i++){
      for (let j=0;j<N;j++){
        const cval = cAxis[j], gval = gAxis[i];
        const m = new CircularEconomyModel(cs.d1, cs.d2, gval, cval, 0.0);
        const profits = [m.profit_SI(), m.profit_LI(), m.profit_SM(), m.profit_LM()];
        const bestIdx = profits.indexOf(Math.max(...profits));
        Z[i][j] = bestIdx;
      }
    }
    results.push({ name: cs.name, Z });
  }
  return { results, cAxis, gAxis, title: 'Joint Choice Strategy Map (Fig 4)' };
}

// FIG 5: Effect of integration cost k (same as Fig4 but for k=0 and k>0)
export function buildFig5Grid({ resolution=50 }) {
  const N = resolution || 50;
  const cAxis = linspace(0.01, 0.35, N);
  const gAxis = linspace(0.5, 1.5, N);
  const kvals = [0.0, 0.02];
  const results = [];
  for (const k of kvals){
    const Z = Array.from({length:N}, ()=> new Array(N).fill(null));
    for (let i=0;i<N;i++){
      for (let j=0;j<N;j++){
        const cval = cAxis[j], gval = gAxis[i];
        const m = new CircularEconomyModel(0.28, 0.1, gval, cval, k);
        const profits = [m.profit_SI(), m.profit_LI(), m.profit_SM(), m.profit_LM()];
        Z[i][j] = profits.indexOf(Math.max(...profits));
      }
    }
    results.push({ k, Z });
  }
  return { results, cAxis, gAxis, title: 'Integration cost effect (Fig 5)' };
}

// FIG 6: Endogenous durability: grid search over delta1 & delta2 for different c0
export function buildFig6Data({ c0min=0.01, c0max=0.15, steps=20 }) {
  const c0_vals = linspace(c0min, c0max, steps);
  const gammas = [0.72, 1.02];
  const search_grid = linspace(0.1, 0.9, 15);
  const out = [];
  for (const gamma of gammas){
    const opt_d1 = [];
    const opt_d2 = [];
    const strategies = [];
    for (const c0 of c0_vals){
      let best_pi = -1e9;
      let best_pair = [0.1, 0.1];
      let best_strat = 'SI';
      for (const d1v of search_grid){
        for (const d2v of search_grid){
          if (d2v >= d1v) continue;
          const c_total = c0 + 0.08*Math.pow(d1v,2) + 0.16*Math.pow(d2v,2);
          const m = new CircularEconomyModel(d1v, d2v, gamma, c_total, 0.0);
          const profits = { SI: m.profit_SI(), LI: m.profit_LI(), SM: m.profit_SM(), LM: m.profit_LM() };
          const strat = Object.keys(profits).reduce((a,b)=> profits[a] > profits[b] ? a : b);
          if (profits[strat] > best_pi){
            best_pi = profits[strat];
            best_pair = [d1v, d2v];
            best_strat = strat;
          }
        }
      }
      opt_d1.push(best_pair[0]);
      opt_d2.push(best_pair[1]);
      strategies.push(best_strat);
    }
    out.push({ gamma, c0_vals, opt_d1, opt_d2, strategies });
  }
  return { out, title: 'Endogenous Durability (Fig 6)' };
}

// Convenience wrapper for single point profits
export function buildGridResults({ d1=0.5, d2=0.1, gamma=1.0, c=0.15, k=0.0 }) {
  const m = new CircularEconomyModel(d1, d2, gamma, c, k);
  return {
    singleProfits: {
      SI: m.profit_SI(),
      LI: m.profit_LI(),
      SM: m.profit_SM(),
      LM: m.profit_LM()
    }
  };
}
