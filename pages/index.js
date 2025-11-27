// pages/index.js
import { useState, useMemo } from 'react';
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

const MathJaxSmall = ({ tex }) => <div dangerouslySetInnerHTML={{ __html: `<div style="font-size:14px">\$begin:math:text$\$\{tex\}\\$end:math:text$</div>` }} />;

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
  function Heatmap({ Z, x, y, title, colorscale, tickvals, ticktext, zmin=0, zmax=1 }) {
    return (
      <Plot
        data={[
          {
            z: Z,
            x,
            y,
            type: 'heatmap',
            colorscale: colorscale,
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
          height: 560
        }}
        useResizeHandler
        style={{ width: '100%' }}
      />
    );
  }

  // Fig6 plot builder
  function Fig6Plot({ data }) {
    // data.out is array of gamma cases
    const traces = [];
    for (const series of data.out){
      traces.push({
        x: series.c0_vals,
        y: series.opt_d1,
        mode: 'lines+markers',
        name: `δ1 (γ=${series.gamma})`
      });
      traces.push({
        x: series.c0_vals,
        y: series.opt_d2,
        mode: 'lines+markers',
        name: `δ2 (γ=${series.gamma})`
      });
    }
    return (
      <Plot
        data={traces}
        layout={{
          title: 'Endogenous Durability (Fig 6)',
          xaxis: { title: 'Base Cost c0' },
          yaxis: { title: 'Optimal durability', range: [0,1] },
          height: 520,
          autosize: true,
          margin: { t: 40, l: 60, r: 20, b: 50 }
        }}
        useResizeHandler
        style={{ width: '100%' }}
      />
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '16px auto', padding: 12 }}>
      <Head>
        <title>Circular Economy Simulator</title>
        <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
      </Head>

      <h1>Circular Economy — Interactive Simulator</h1>
      <p>Pick a figure and adjust parameters. Infeasible region (δ₂ ≥ δ₁) is transparent.</p>

      <div style={{ display: 'flex', gap: 18 }}>
        <div style={{ flex: 1, background:'#fff', padding:12, borderRadius:8 }}>
          <label>δ1 (strong) <b>{d1.toFixed(2)}</b>
            <input style={{ width:'100%' }} type="range" min="0.05" max="0.99" step="0.01" value={d1} onChange={e => setD1(parseFloat(e.target.value))} />
          </label>

          <label>δ2 (weak) <b>{d2.toFixed(2)}</b>
            <input style={{ width:'100%' }} type="range" min="0.01" max={Math.min(0.98, d1 - 0.01)} step="0.01" value={d2} onChange={e => setD2(parseFloat(e.target.value))} />
          </label>

          <label>γ <b>{gamma.toFixed(2)}</b>
            <input style={{ width:'100%' }} type="range" min="0.5" max="1.5" step="0.01" value={gamma} onChange={e => setGamma(parseFloat(e.target.value))} />
          </label>

          <label>c <b>{c.toFixed(3)}</b>
            <input style={{ width:'100%' }} type="range" min="0.01" max="0.35" step="0.005" value={c} onChange={e => setC(parseFloat(e.target.value))} />
          </label>

          <label>k <b>{k.toFixed(3)}</b>
            <input style={{ width:'100%' }} type="range" min="0.0" max="0.05" step="0.001" value={k} onChange={e => setK(parseFloat(e.target.value))} />
          </label>

          <label>resolution <b>{resolution}</b>
            <input style={{ width:'100%' }} type="range" min="20" max="100" step="4" value={resolution} onChange={e => setResolution(parseInt(e.target.value))} />
          </label>

          <div style={{ marginTop:8 }}>
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

        <div style={{ flex: 1, background:'#fff', padding:12, borderRadius:8 }}>
          <h3 style={{ marginTop:0 }}>Key equations (simplified)</h3>
          <MathJaxSmall tex={'\\Pi_{SI} = \\frac{(2 - 4c + (\\delta_1 + \\delta_2))^2}{8(2 + 3(\\delta_1 + \\delta_2))}'} />
          <MathJaxSmall tex={'\\Pi_{LI} = \\text{(numerical)} \\quad \\Pi_{SM} = \\Pi_1^{mod} + \\Pi_2^{mod}'} />
        </div>
      </div>

      <main style={{ marginTop: 14 }}>
        {figure === 'fig1' && (() => {
          // show selling or leasing choice switcher: use gridData with Z_sell and Z_leas
          return (
            <>
              <h3>Fig 1: Architecture Choice — Selling</h3>
              <HeatmapInner Z={gridData.Z_sell} x={gridData.xAxis} y={gridData.yAxis} title="Selling: SM vs SI" />
              <h3 style={{ marginTop: 18 }}>Fig 1: Architecture Choice — Leasing</h3>
              <HeatmapInner Z={gridData.Z_leas} x={gridData.xAxis} y={gridData.yAxis} title="Leasing: LM vs LI" />
            </>
          );
        })()}

        {figure === 'fig2' && (() => {
          // gridData.results contains two grids for gamma=0.8 and 1.2
          const cmap = [
            [0, 'rgb(255,255,255)'], // 0 -> white
            [0.25, 'rgb(144,238,144)'],
            [0.5, 'rgb(255,127,127)'],
            [0.9, 'rgb(221,221,221)']
          ];
          return (
            <>
              <h3>Fig 2: Architecture Switching</h3>
              {gridData.results.map((r, idx) => (
                <div key={idx} style={{ marginBottom: 12 }}>
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
            </>
          );
        })()}

        {figure === 'fig3' && (() => {
          return (
            <>
              <h3>Fig 3: Business Model Choice</h3>
              <div style={{ marginBottom: 12 }}>
                <h4>Integral preference (Lease>Sell)</h4>
                <Plot data={[{
                  z: gridData.Z_int, x: gridData.cAxis, y: gridData.gAxis, type:'heatmap',
                  zmin:0, zmax:1, zsmooth:false, colorscale:[['0','rgb(221,221,221)'],['1','rgb(136,136,136)']],
                  hovertemplate: 'c: %{x}<br>γ: %{y}<br>val: %{z}<extra></extra>'
                }]} layout={{height:380, title:'Integral: Lease vs Sell'}} useResizeHandler style={{width:'100%'}} />
              </div>

              <div style={{ marginBottom: 12 }}>
                <h4>Modular preference (Lease>Sell)</h4>
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
            </>
          );
        })()}

        {figure === 'fig4' && (() => {
          return (
            <>
              <h3>Fig 4: Joint Choice Strategy Map</h3>
              {gridData.results.map((r, idx) => (
                <div key={idx} style={{ marginBottom: 12 }}>
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
            </>
          );
        })()}

        {figure === 'fig5' && (() => {
          return (
            <>
              <h3>Fig 5: Integration cost effect (k=0 vs k=0.02)</h3>
              {gridData.results.map((r, idx) => (
                <div key={idx} style={{ marginBottom: 12 }}>
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
            </>
          );
        })()}

        {figure === 'fig6' && (() => {
          return (
            <>
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
            </>
          );
        })()}

        {figure === 'table' && (() => (
          <div style={{ background:'#fff', padding:12, borderRadius:8 }}>
            <h3>Single-point profits</h3>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr><th style={{border:'1px solid #eee',padding:8}}>Strategy</th><th style={{border:'1px solid #eee',padding:8}}>Profit</th></tr></thead>
              <tbody>
                {Object.entries(gridData.singleProfits).map(([k,v]) => (
                  <tr key={k}><td style={{border:'1px solid #eee',padding:8}}>{k}</td><td style={{border:'1px solid #eee',padding:8}}>{v.toFixed(6)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}

      </main>
    </div>
  );
}

// Small inner heatmap wrapper to keep JSX tidy
function HeatmapInner({ Z, x, y, title }) {
  // if Z is undefined, show placeholder text
  if (!Z) return <div style={{ padding: 16, color: '#666' }}>No data (adjust resolution / params)</div>;
  return (
    <Plot
      data={[{ z: Z, x, y, type: 'heatmap', zsmooth: false, colorscale:[['0','rgb(240,240,240)'],['1','rgb(200,30,30)']], hovertemplate:'δ1: %{x}<br>δ2: %{y}<br>val: %{z}<extra></extra>' }]}
      layout={{ title, height:520, autosize:true, margin:{t:40, l:60} }}
      useResizeHandler
      style={{ width: '100%' }}
    />
  );
}
