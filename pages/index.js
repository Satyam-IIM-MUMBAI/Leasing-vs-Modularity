// pages/index.js
import { useState, useMemo, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import {
  buildGridResults,
  buildFig1Grid,
  buildFig2Grid,
  buildFig3Grid,
  buildFig4Grid,
  buildFig5Grid,
  buildFig6Data
} from '../utils/model';

// Client-only Plotly using the lightweight bundle + factory
const Plot = dynamic(
  async () => {
    const Plotly = await import('plotly.js-basic-dist');
    const createPlotlyComponent = (await import('react-plotly.js/factory')).default;
    return createPlotlyComponent(Plotly);
  },
  { ssr: false }
);

const MathJaxSmall = ({ tex }) => {
  const ref = useRef(null);

  useEffect(() => {
    let ignore = false;
    const typeset = () => {
      if (ignore) return;
      if (window.MathJax && window.MathJax.typesetPromise) {
        window.MathJax.typesetPromise([ref.current])
          .catch((err) => console.log('MathJax error:', err));
      } else {
        setTimeout(typeset, 100);
      }
    };
    typeset();
    return () => { ignore = true; };
  }, [tex]);

  return <div ref={ref} className="mjx-container" style={{ fontSize: '14px' }}>{`\\[ ${tex} \\]`}</div>;
};

export default function Home() {
  const [d1, setD1] = useState(0.5);
  const [d2, setD2] = useState(0.2);
  const [gamma, setGamma] = useState(1.0);
  const [c, setC] = useState(0.15);
  const [k, setK] = useState(0.0);
  const [resolution, setResolution] = useState(48);
  const [figure, setFigure] = useState('fig1');

  // memoized grid data
  const gridData = useMemo(() => {
    const params = { d1, d2, gamma, c, k, resolution };
    switch (figure) {
      case 'fig1': return buildFig1Grid(params);
      case 'fig2': return buildFig2Grid({ resolution });
      case 'fig3': return buildFig3Grid({ resolution, d1, d2 });
      case 'fig4': return buildFig4Grid({ resolution });
      case 'fig5': return buildFig5Grid({ resolution });
      case 'fig6': return buildFig6Data({ steps: 20 });
      case 'table': return buildGridResults(params);
      default: return buildFig1Grid(params);
    }
  }, [figure, d1, d2, gamma, c, k, resolution]);

  // helper: heatmap for a Z matrix
  function HeatmapInner({ Z, x, y, title, colorscale, tickvals, ticktext, zmin=0, zmax=1 }) {
    // if Z is undefined, show placeholder text
    if (!Z) return <div style={{ padding: 16, color: '#666' }}>No data (adjust resolution / params)</div>;
    return (
      <Plot
        data={[
          {
            z: Z,
            x,
            y,
            type: 'heatmap',
            colorscale: colorscale || [['0','rgb(240,240,240)'],['1','rgb(200,30,30)']],
            zmin,
            zmax,
            zsmooth: false,
            hovertemplate: 'x: %{x}<br>y: %{y}<br>val: %{z}<extra></extra>',
            showscale: true,
            colorbar: { tickvals: tickvals, ticktext: ticktext }
          }
        ]}
        layout={{
          title,
          autosize: true,
          margin: { t: 40, l: 60, r: 70, b: 50 },
          xaxis: { title: 'δ1 (strong)' },
          yaxis: { title: 'δ2 (weak)', autorange: 'reversed' },
          height: 520
        }}
        useResizeHandler
        style={{ width: '100%' }}
      />
    );
  }

  return (
    <div className="container">
      <Head>
        <title>Circular Economy Simulator</title>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.MathJax = {
                tex: {
                  inlineMath: [['$', '$'], ['\\\\(', '\\\\)']],
                  displayMath: [['$$', '$$'], ['\\\\[', '\\\\]']],
                  packages: ['base', 'ams', 'noerrors', 'noundefined']
                },
                svg: {
                  fontCache: 'global'
                },
                startup: {
                  typeset: false
                }
              };
            `,
          }}
        />
        <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
      </Head>

      <header>
        <h1>Circular Economy — Interactive Simulator</h1>
        <p>Pick a figure and adjust parameters. Infeasible region (δ₂ ≥ δ₁) is transparent.</p>
      </header>

      <div className="layout-grid">
        <aside className="sidebar">
          <div className="card">
            <div className="control-group">
              <label>
                <span>δ1 (strong)</span>
                <b>{d1.toFixed(2)}</b>
              </label>
              <input type="range" min="0.05" max="0.99" step="0.01" value={d1} onChange={e => setD1(parseFloat(e.target.value))} />
            </div>

            <div className="control-group">
              <label>
                <span>δ2 (weak)</span>
                <b>{d2.toFixed(2)}</b>
              </label>
              <input type="range" min="0.01" max={Math.min(0.98, d1 - 0.01)} step="0.01" value={d2} onChange={e => setD2(parseFloat(e.target.value))} />
            </div>

            <div className="control-group">
              <label>
                <span>γ</span>
                <b>{gamma.toFixed(2)}</b>
              </label>
              <input type="range" min="0.5" max="1.5" step="0.01" value={gamma} onChange={e => setGamma(parseFloat(e.target.value))} />
            </div>

            <div className="control-group">
              <label>
                <span>c</span>
                <b>{c.toFixed(3)}</b>
              </label>
              <input type="range" min="0.01" max="0.35" step="0.005" value={c} onChange={e => setC(parseFloat(e.target.value))} />
            </div>

            <div className="control-group">
              <label>
                <span>k</span>
                <b>{k.toFixed(3)}</b>
              </label>
              <input type="range" min="0.0" max="0.05" step="0.001" value={k} onChange={e => setK(parseFloat(e.target.value))} />
            </div>

            <div className="control-group">
              <label>
                <span>Resolution</span>
                <b>{resolution}</b>
              </label>
              <input type="range" min="20" max="100" step="4" value={resolution} onChange={e => setResolution(parseInt(e.target.value))} />
            </div>

            <div className="select-wrapper">
              <select value={figure} onChange={e => setFigure(e.target.value)}>
                <option value="fig1">Fig 1 — Architecture Choice (selling/leasing)</option>
                <option value="fig2">Fig 2 — Architecture Switching</option>
                <option value="fig3">Fig 3 — Business Model Choice</option>
                <option value="fig4">Fig 4 — Joint Choice Strategy Map</option>
                <option value="fig5">Fig 5 — Integration Cost Effect</option>
                <option value="fig6">Fig 6 — Endogenous Durability</option>
                <option value="table">Single-point profits</option>
              </select>
            </div>
          </div>

          <div className="card equations-card">
            <h3>Key equations (simplified)</h3>
            <MathJaxSmall tex={'\\Pi_{SI} = \\frac{(2 - 4c + (\\delta_1 + \\delta_2))^2}{8(2 + 3(\\delta_1 + \\delta_2))}'} />
            <MathJaxSmall tex={'\\Pi_{LI} = \\text{(numerical)} \\quad \\Pi_{SM} = \\Pi_1^{mod} + \\Pi_2^{mod}'} />
          </div>
        </aside>

        <main className="main-content">
          {figure === 'fig1' && (() => {
            return (
              <>
                <div className="plot-container">
                  <h3>Fig 1: Architecture Choice — Selling</h3>
                  <HeatmapInner Z={gridData.Z_sell} x={gridData.xAxis} y={gridData.yAxis} title="Selling: SM vs SI" />
                </div>
                <div className="plot-container">
                  <h3>Fig 1: Architecture Choice — Leasing</h3>
                  <HeatmapInner Z={gridData.Z_leas} x={gridData.xAxis} y={gridData.yAxis} title="Leasing: LM vs LI" />
                </div>
              </>
            );
          })()}

          {figure === 'fig2' && (() => {
            const cmap = [
              [0, 'rgb(255,255,255)'],
              [0.25, 'rgb(144,238,144)'],
              [0.5, 'rgb(255,127,127)'],
              [0.9, 'rgb(221,221,221)']
            ];
            return (
              <>
                <div className="plot-container">
                  <h3>Fig 2: Architecture Switching</h3>
                  {gridData.results.map((r, idx) => (
                    <div key={idx} style={{ marginBottom: 24 }}>
                      <h4>γ = {r.gamma}</h4>
                      <Plot
                        data={[{
                          z: r.Z,
                          x: gridData.xAxis,
                          y: gridData.yAxis,
                          type: 'heatmap',
                          colorscale: cmap,
                          zmin: 0, zmax: 3,
                          zsmooth: false,
                          hovertemplate: 'δ1: %{x}<br>δ2: %{y}<br>code: %{z}<extra></extra>'
                        }]}
                        layout={{ title: `Switch map γ=${r.gamma}`, height: 520, margin: {t:40, l:60} }}
                        useResizeHandler
                        style={{ width: '100%' }}
                      />
                    </div>
                  ))}
                </div>
              </>
            );
          })()}

          {figure === 'fig3' && (() => {
            return (
              <div className="plot-container">
                <h3>Fig 3: Business Model Choice</h3>
                <div style={{ marginBottom: 24 }}>
                  <h4>Integral preference (Lease &gt; Sell)</h4>
                  <Plot data={[{
                    z: gridData.Z_int, x: gridData.cAxis, y: gridData.gAxis, type:'heatmap',
                    zmin:0, zmax:1, zsmooth:false, colorscale:[['0','rgb(221,221,221)'],['1','rgb(136,136,136)']],
                    hovertemplate: 'c: %{x}<br>γ: %{y}<br>val: %{z}<extra></extra>'
                  }]} layout={{height:380, title:'Integral: Lease vs Sell'}} useResizeHandler style={{width:'100%'}} />
                </div>

                <div style={{ marginBottom: 24 }}>
                  <h4>Modular preference (Lease &gt; Sell)</h4>
                  <Plot data={[{
                    z: gridData.Z_mod, x: gridData.cAxis, y: gridData.gAxis, type:'heatmap',
                    zmin:0, zmax:1, zsmooth:false, colorscale:[['0','rgb(221,221,221)'],['1','rgb(136,136,136)']],
                    hovertemplate: 'c: %{x}<br>γ: %{y}<br>val: %{z}<extra></extra>'
                  }]} layout={{height:380, title:'Modular: Lease vs Sell'}} useResizeHandler style={{width:'100%'}} />
                </div>

                <div>
                  <h4>Switch regions</h4>
                  <Plot data={[{
                    z: gridData.Z_switch, x: gridData.cAxis, y: gridData.gAxis, type:'heatmap',
                    zsmooth:false, colorscale:[['0','white'],['0.5','salmon'],['1','lightgrey']],
                    hovertemplate: 'c: %{x}<br>γ: %{y}<br>code: %{z}<extra></extra>'
                  }]} layout={{height:380, title:'Switch Map'}} useResizeHandler style={{width:'100%'}} />
                </div>
              </div>
            );
          })()}

          {figure === 'fig4' && (() => {
            return (
              <div className="plot-container">
                <h3>Fig 4: Joint Choice Strategy Map</h3>
                {gridData.results.map((r, idx) => (
                  <div key={idx} style={{ marginBottom: 24 }}>
                    <h4>{r.name}</h4>
                    <Plot data={[{
                      z: r.Z, x: gridData.cAxis, y: gridData.gAxis, type:'heatmap',
                      zsmooth:false, colorscale:[
                        [0,'rgb(31,119,180)'], [0.33,'rgb(31,119,180)'],
                        [0.34,'rgb(255,127,14)'], [0.66,'rgb(255,127,14)'],
                        [0.67,'rgb(44,160,44)'], [0.99,'rgb(44,160,44)'],
                        [1,'rgb(214,39,40)']
                      ],
                      zmin:0, zmax:3,
                      hovertemplate: 'c: %{x}<br>γ: %{y}<br>code: %{z}<extra></extra>'
                    }]} layout={{height:520}} useResizeHandler style={{width:'100%'}} />
                  </div>
                ))}
              </div>
            );
          })()}

          {figure === 'fig5' && (() => {
            return (
              <div className="plot-container">
                <h3>Fig 5: Integration cost effect (k=0 vs k=0.02)</h3>
                {gridData.results.map((r, idx) => (
                  <div key={idx} style={{ marginBottom: 24 }}>
                    <h4>k = {r.k}</h4>
                    <Plot data={[{
                      z: r.Z, x: gridData.cAxis, y: gridData.gAxis, type:'heatmap',
                      zsmooth:false, colorscale:[
                        [0,'rgb(31,119,180)'], [0.33,'rgb(31,119,180)'],
                        [0.34,'rgb(255,127,14)'], [0.66,'rgb(255,127,14)'],
                        [0.67,'rgb(44,160,44)'], [0.99,'rgb(44,160,44)'],
                        [1,'rgb(214,39,40)']
                      ],
                      zmin:0, zmax:3,
                      hovertemplate: 'c: %{x}<br>γ: %{y}<br>code: %{z}<extra></extra>'
                    }]} layout={{height:520}} useResizeHandler style={{width:'100%'}} />
                  </div>
                ))}
              </div>
            );
          })()}

          {figure === 'fig6' && (() => {
            return (
              <div className="plot-container">
                <h3>Fig 6: Endogenous Durability</h3>
                <Plot
                  data={
                    gridData.out.flatMap(series => ([
                      { x: series.c0_vals, y: series.opt_d1, mode: 'lines+markers', name: `δ1 (γ=${series.gamma})` },
                      { x: series.c0_vals, y: series.opt_d2, mode: 'lines+markers', name: `δ2 (γ=${series.gamma})` }
                    ]))
                  }
                  layout={{ title: 'Optimal δ1 & δ2 vs c0', xaxis:{title:'c0'}, yaxis:{title:'durability',range:[0,1]}, height:520 }}
                  useResizeHandler
                  style={{ width: '100%' }}
                />
              </div>
            );
          })()}

          {figure === 'table' && (() => (
            <div className="plot-container">
              <h3>Single-point profits</h3>
              <table>
                <thead><tr><th>Strategy</th><th>Profit</th></tr></thead>
                <tbody>
                  {Object.entries(gridData.singleProfits).map(([k,v]) => (
                    <tr key={k}><td>{k}</td><td>{v.toFixed(6)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}

        </main>
      </div>
    </div>
  );
}
