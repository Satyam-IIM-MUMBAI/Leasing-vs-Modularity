// pages/index.js
import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { buildGridResults, buildFig1Grid, buildJointChoiceGrid } from '../utils/model';
import Head from 'next/head';

// Client-only Plotly component using the lightweight bundle (robust)
const PlotClient = dynamic(
  async () => {
    const Plotly = await import('plotly.js-basic-dist');
    const createPlotlyComponent = (await import('react-plotly.js/factory')).default;
    return createPlotlyComponent(Plotly);
  },
  { ssr: false }
);

// Small safe LaTeX renderer (MathJax loaded in <Head>)
const MathJax = ({ tex }) => (
  <div dangerouslySetInnerHTML={{ __html: `<div style="font-size:15px;">\$begin:math:text$\$\{tex\}\\$end:math:text$</div>` }} />
);

export default function Home() {
  // Primary parameters (sliders)
  const [d1, setD1] = useState(0.5);
  const [d2, setD2] = useState(0.2);
  const [gamma, setGamma] = useState(1.0);
  const [c, setC] = useState(0.15);
  const [k, setK] = useState(0.0);
  const [resolution, setResolution] = useState(40);
  const [figure, setFigure] = useState('fig1');

  // Derived grid (memoized)
  const gridData = useMemo(() => {
    const params = { d1, d2, gamma, c, k, resolution };
    if (figure === 'fig1') {
      return buildFig1Grid(params);
    } else if (figure === 'joint') {
      return buildJointChoiceGrid(params);
    } else {
      return buildGridResults(params);
    }
  }, [d1, d2, gamma, c, k, resolution, figure]);

  // Plot builder for discrete heatmaps (no smoothing)
  const heatmapPlot = (Z, x, y, title, options = {}) => {
    // Z: 2D array with numbers or null (null => transparent)
    // Plotly expects z as array of rows (y major) matching x and y axes.
    const { zmin = 0, zmax = 1, colorscale = [['0','rgb(240,240,240)'], ['1','rgb(200,30,30)']], tickvals=[0,1], ticktext=['Integral','Modular'] } = options;

    return (
      <PlotClient
        data={[
          {
            z: Z,
            x,
            y,
            type: 'heatmap',
            colorscale,
            zmin,
            zmax,
            zsmooth: false,
            hovertemplate: 'δ1: %{x}<br>δ2: %{y}<br>val: %{z}<extra></extra>',
            colorbar: { tickvals, ticktext, title: '' },
            showscale: true,
          },
        ]}
        layout={{
          title,
          autosize: true,
          margin: { t: 40, l: 60, r: 70, b: 50 },
          xaxis: { title: 'δ1 (strong)', range: [Math.min(...x), Math.max(...x)] },
          yaxis: { title: 'δ2 (weak)', autorange: 'reversed', range: [Math.min(...y), Math.max(...y)] },
          height: 560,
        }}
        useResizeHandler
        style={{ width: '100%' }}
      />
    );
  };

  return (
    <div className="container" style={{ maxWidth: 1200, margin: '14px auto', padding: 12 }}>
      <Head>
        <title>Circular Economy Simulator</title>
        <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
      </Head>

      <header style={{ marginBottom: 12 }}>
        <h1 style={{ margin: '6px 0' }}>Circular Economy — Interactive Simulator</h1>
        <p style={{ margin: 0 }}>Drag sliders to explore strategy maps. Infeasible region (δ₂ ≥ δ₁) is transparent.</p>
      </header>

      <section style={{ display: 'flex', gap: 18, marginTop: 12 }}>
        <div style={{ flex: 1, background: '#fff', padding: 12, borderRadius: 8, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          <label style={{ display:'block', marginBottom:10 }}>δ1 (strong) <b>{d1.toFixed(2)}</b>
            <input style={{ width:'100%' }} type="range" min="0.05" max="0.99" step="0.01" value={d1} onChange={e => setD1(parseFloat(e.target.value))} />
          </label>

          <label style={{ display:'block', marginBottom:10 }}>δ2 (weak) <b>{d2.toFixed(2)}</b>
            <input style={{ width:'100%' }} type="range" min="0.01" max={Math.min(0.98, d1 - 0.01)} step="0.01" value={d2} onChange={e => setD2(parseFloat(e.target.value))} />
          </label>

          <label style={{ display:'block', marginBottom:10 }}>γ <b>{gamma.toFixed(2)}</b>
            <input style={{ width:'100%' }} type="range" min="0.5" max="1.5" step="0.01" value={gamma} onChange={e => setGamma(parseFloat(e.target.value))} />
          </label>

          <label style={{ display:'block', marginBottom:10 }}>c <b>{c.toFixed(3)}</b>
            <input style={{ width:'100%' }} type="range" min="0.01" max="0.35" step="0.005" value={c} onChange={e => setC(parseFloat(e.target.value))} />
          </label>

          <label style={{ display:'block', marginBottom:10 }}>k (integration cost) <b>{k.toFixed(3)}</b>
            <input style={{ width:'100%' }} type="range" min="0.0" max="0.05" step="0.001" value={k} onChange={e => setK(parseFloat(e.target.value))} />
          </label>

          <label style={{ display:'block', marginBottom:10 }}>Grid resolution <b>{resolution}</b>
            <input style={{ width:'100%' }} type="range" min="20" max="100" step="5" value={resolution} onChange={e => setResolution(parseInt(e.target.value))} />
          </label>

          <div style={{ marginTop: 8 }}>
            <select value={figure} onChange={e => setFigure(e.target.value)}>
              <option value="fig1">Figure 1 — Architecture Choice (selling)</option>
              <option value="leas">Figure 1 — Architecture Choice (leasing)</option>
              <option value="joint">Figure 4 — Joint Choice Strategy Map</option>
              <option value="table">Single-point profits table</option>
            </select>
          </div>
        </div>

        <div style={{ flex: 1, background: '#fff', padding: 12, borderRadius: 8, boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
          <h3 style={{ marginTop: 0 }}>Key equations (paper → simplified)</h3>
          <div style={{ marginBottom: 8 }}>
            <MathJax tex={'\\Pi_{SI} = \\frac{(2 - 4c + (\\delta_1 + \\delta_2))^2}{8(2 + 3(\\delta_1 + \\delta_2))}'} />
          </div>
          <div style={{ marginBottom: 8 }}>
            <MathJax tex={'\\Pi_{LI} = \\text{(numerical)}\\; or\\; \\frac{(2 - 4c + (\\delta_1^L + \\delta_2^L))^2}{8(2 + 3(\\delta_1^L + \\delta_2^L))}'} />
          </div>
          <div>
            <MathJax tex={'\\Pi_{SM} = \\Pi_{1}^{mod} + \\Pi_{2}^{mod} \\text{ (computed client-side)}'} />
          </div>
        </div>
      </section>

      <main style={{ marginTop: 18 }}>
        {figure === 'table' ? (
          <div style={{ background:'#fff', padding:12, borderRadius:8 }}>
            <h3>Single-point profit outputs</h3>
            <table style={{ borderCollapse:'collapse', width:'100%' }}>
              <thead><tr><th style={{border:'1px solid #eee',padding:8}}>Strategy</th><th style={{border:'1px solid #eee',padding:8}}>Profit</th></tr></thead>
              <tbody>
                {Object.entries(gridData.singleProfits).map(([k,v]) =>
                  <tr key={k}>
                    <td style={{border:'1px solid #eee',padding:8}}>{k}</td>
                    <td style={{border:'1px solid #eee',padding:8}}>{v.toFixed(6)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ background:'#fff', padding:12, borderRadius:8 }}>
            { (figure === 'fig1') && heatmapPlot(gridData.Z, gridData.xAxis, gridData.yAxis, 'Architecture Choice — Selling', {
              colorscale: [['0','rgb(240,240,240)'], ['1','rgb(200,30,30)']],
              tickvals:[0,1], ticktext:['Integral','Modular']
            }) }
            { (figure === 'leas') && heatmapPlot(gridData.Z_leasing, gridData.xAxis, gridData.yAxis, 'Architecture Choice — Leasing', {
              colorscale: [['0','rgb(240,240,240)'], ['1','rgb(200,30,30)']],
              tickvals:[0,1], ticktext:['Integral','Modular']
            }) }
            { (figure === 'joint') && heatmapPlot(gridData.Z_joint, gridData.cAxis, gridData.gAxis, 'Joint Choice Strategy Map', {
              // Use 0..3 discrete colors for SI,LI,SM,LM
              colorscale: [
                ['0','rgb(31,119,180)'], ['0.33','rgb(31,119,180)'],
                ['0.34','rgb(255,127,14)'], ['0.66','rgb(255,127,14)'],
                ['0.67','rgb(44,160,44)'], ['0.99','rgb(44,160,44)'],
                ['1.0','rgb(214,39,40)']
              ],
              zmin:0, zmax:3, tickvals:[0,1,2,3], ticktext:['SI','LI','SM','LM']
            }) }
          </div>
        )}
      </main>

      <footer style={{ marginTop: 12 }}>
        <small>Client-side simulation — ready for Vercel. Grid-based numerical optimization for determinism.</small>
      </footer>
    </div>
  );
}
