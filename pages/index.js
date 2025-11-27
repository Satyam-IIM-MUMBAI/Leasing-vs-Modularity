import { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';

// Client-side-only Plot component to avoid server-side Plotly errors
const Plot = dynamic(() => import('react-plotly.js'), { ssr: false });
import { buildGridResults, buildFig1Grid, buildJointChoiceGrid } from '../utils/model';

// Quick LaTeX renderer using MathJax CDN
const MathJax = ({ tex }) => (
  <div dangerouslySetInnerHTML={{
    __html: `<script type="math/tex; mode=display">${tex}</script>`
  }} />
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

  // plotting helpers
  const contourPlot = (Z, x, y, title, colors) => {
    return (
      <Plot
        data={[{
          z: Z,
          x,
          y,
          type: 'contour',
          colorscale: colors || 'Greys',
          contours: { showlines: false }
        }]}
        layout={{
          title,
          autosize: true,
          xaxis: { title: 'δ1' },
          yaxis: { title: 'δ2', autorange: 'reversed' },
          height: 520
        }}
        useResizeHandler
        style={{ width: '100%' }}
      />
    );
  };

  return (
    <div className="container">
      <header>
        <h1>Circular Economy — Interactive Simulator</h1>
        <p>Equations displayed below; drag sliders to explore strategies.</p>
      </header>

      <section className="controls">
        <div className="sliders">
          <label>δ1 (strong) <b>{d1.toFixed(2)}</b>
            <input type="range" min="0.05" max="0.99" step="0.01" value={d1} onChange={e => setD1(parseFloat(e.target.value))} />
          </label>

          <label>δ2 (weak) <b>{d2.toFixed(2)}</b>
            <input type="range" min="0.01" max={Math.min(0.98, d1 - 0.01)} step="0.01" value={d2} onChange={e => setD2(parseFloat(e.target.value))} />
          </label>

          <label>γ <b>{gamma.toFixed(2)}</b>
            <input type="range" min="0.5" max="1.5" step="0.01" value={gamma} onChange={e => setGamma(parseFloat(e.target.value))} />
          </label>

          <label>c <b>{c.toFixed(3)}</b>
            <input type="range" min="0.01" max="0.35" step="0.005" value={c} onChange={e => setC(parseFloat(e.target.value))} />
          </label>

          <label>k (integration cost) <b>{k.toFixed(3)}</b>
            <input type="range" min="0.0" max="0.05" step="0.001" value={k} onChange={e => setK(parseFloat(e.target.value))} />
          </label>

          <label>Grid resolution <b>{resolution}</b>
            <input type="range" min="20" max="100" step="5" value={resolution} onChange={e => setResolution(parseInt(e.target.value))} />
          </label>

          <div className="figure-select">
            <label>
              <select value={figure} onChange={e => setFigure(e.target.value)}>
                <option value="fig1">Figure 1 — Architecture Choice (selling/leasing)</option>
                <option value="joint">Figure 4 — Joint Choice Strategy Map</option>
                <option value="table">Single-point profits table</option>
              </select>
            </label>
          </div>
        </div>

        <div className="equations">
          <h3>Key equations (paper → simplified)</h3>
          <div className="eq">
            <MathJax tex={'\\text{Profit Selling Integral: } \\Pi_{SI} = \\frac{(2 - 2\\cdot 2c + (\\delta_1+\\delta_2))^2}{8(2+3(\\delta_1+\\delta_2))}'} />
          </div>
          <div className="eq">
            <MathJax tex={'\\text{Profit Leasing Integral: solved numerically or } \\Pi_{LI} = \\frac{(2 - 2\\cdot 2c + (\\delta_1^L+\\delta_2^L))^2}{8(2+3(\\delta_1^L+\\delta_2^L))} \\text{ when reuse full}'} />
          </div>
          <div className="eq">
            <MathJax tex={'\\text{Modular profits: } \\Pi_{SM} = \\Pi_{1}^{mod} + \\Pi_{2}^{mod} \\quad (\\text{closed forms in paper; implemented numerically here})'} />
          </div>
        </div>
      </section>

      <main>
        {figure === 'table' ? (
          <div className="panel">
            <h3>Single-point profit outputs</h3>
            <table>
              <thead><tr><th>Strategy</th><th>Profit</th></tr></thead>
              <tbody>
                {Object.entries(gridData.singleProfits).map(([k,v]) =>
                  <tr key={k}><td>{k}</td><td>{v.toFixed(5)}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="plot-panel">
            {contourPlot(gridData.Z, gridData.xAxis, gridData.yAxis, gridData.title, gridData.colors)}
          </div>
        )}
      </main>

      <footer>
        <p>Client-side simulation — ready for Vercel. Grid-based numerical optimization for determinism.</p>
      </footer>

      {/* Load MathJax */}
      <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
    </div>
  );
}
