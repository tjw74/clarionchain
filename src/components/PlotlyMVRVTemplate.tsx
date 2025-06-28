import React, { useEffect, useState } from 'react';
import Plot from 'react-plotly.js';
import { Layout } from 'plotly.js';
import { Range, getTrackBackground } from 'react-range';

// Types for props (for future reusability)
interface PlotlyMVRVTemplateProps {
  // Optionally allow override of endpoints, colors, labels, etc.
  marketValueEndpoint?: string;
  realizedValueEndpoint?: string;
  mvrvRatioEndpoint?: string;
  height?: number | string;
  width?: number | string;
  range: [number, number];
  dates: string[];
}

// Helper for formatting
const formatUSD = (v: number) => {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `$${(v / 1e3).toFixed(2)}K`;
  return `$${v.toFixed(2)}`;
};

const formatRatio = (v: number) => v?.toFixed(2);

const defaultColors = {
  market: '#3b82f6',
  realized: '#fbbf24',
  mvrv: '#ffffff',
};

const defaultLabels = {
  market: 'Market Value',
  realized: 'Realized Value',
  mvrv: 'MVRV Ratio',
};

const SLIDER_STEP = 1;
const SLIDER_MIN = 0;

const PlotlyMVRVTemplate: React.FC<PlotlyMVRVTemplateProps> = ({
  marketValueEndpoint = 'https://brk.openonchain.dev/api/vecs/dateindex-to-marketcap?from=-10000',
  realizedValueEndpoint = 'https://brk.openonchain.dev/api/vecs/dateindex-to-realized-cap?from=-10000',
  height = 700,
  width = '100%',
  range,
  dates,
}) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch and align data
  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(marketValueEndpoint).then(r => r.json()),
      fetch(realizedValueEndpoint).then(r => r.json()),
    ]).then(([marketArr, realizedArr]) => {
      const n = Math.min(marketArr.length, realizedArr.length);
      const mvrvArr = Array.from({ length: n }, (_, i) => {
        const mv = marketArr[i];
        const rv = realizedArr[i];
        return (typeof mv === 'number' && typeof rv === 'number' && rv !== 0) ? mv / rv : null;
      });
      setData([
        { y: marketArr, name: defaultLabels.market, color: defaultColors.market },
        { y: realizedArr, name: defaultLabels.realized, color: defaultColors.realized },
        { y: mvrvArr, name: defaultLabels.mvrv, color: defaultColors.mvrv },
      ]);
      setLoading(false);
    }).catch(e => {
      setError('Failed to load data');
      setLoading(false);
    });
  }, [marketValueEndpoint, realizedValueEndpoint]);

  if (loading) return <div className="w-full h-[400px] flex items-center justify-center text-white">Loading chart…</div>;
  if (error) return <div className="w-full h-[400px] flex items-center justify-center text-red-400">{error}</div>;

  // Slice data for selected range
  const [minIdx, maxIdx] = range;
  const slicedDates = dates.slice(minIdx, maxIdx + 1);
  const marketTrace = {
    x: slicedDates,
    y: data[0]?.y?.slice(minIdx, maxIdx + 1),
    name: typeof data[0]?.name === 'string' ? data[0].name : undefined,
    line: { color: data[0]?.color, width: 2 },
    mode: 'lines',
    yaxis: 'y', xaxis: 'x',
    hovertemplate: '%{x}<br>' + data[0]?.name + ': %{y:$,.2f}<extra></extra>',
    connectgaps: false,
  };
  const realizedTrace = {
    x: slicedDates,
    y: data[1]?.y?.slice(minIdx, maxIdx + 1),
    name: typeof data[1]?.name === 'string' ? data[1].name : undefined,
    line: { color: data[1]?.color, width: 2 },
    mode: 'lines',
    yaxis: 'y', xaxis: 'x',
    hovertemplate: '%{x}<br>' + data[1]?.name + ': %{y:$,.2f}<extra></extra>',
    connectgaps: false,
  };
  const mvrvTrace = {
    x: slicedDates,
    y: data[2]?.y?.slice(minIdx, maxIdx + 1),
    name: typeof data[2]?.name === 'string' ? data[2].name : undefined,
    line: { color: data[2]?.color, width: 2 },
    mode: 'lines',
    yaxis: 'y2', xaxis: 'x2',
    hovertemplate: '%{x}<br>' + data[2]?.name + ': %{y:.2f}<extra></extra>',
    connectgaps: false,
  };

  // Calculate evenly spaced log ticks for MVRV Y axis
  const mvrvY = marketTrace.y?.filter((v: number) => typeof v === 'number' && v > 0) || [];
  let yTicks: number[] = [];
  let yTickText: string[] = [];
  if (mvrvY.length > 0) {
    let min = Math.min(...mvrvY), max = Math.max(...mvrvY);
    if (min === max) { min = min * 0.9; max = max * 1.1; }
    const logMin = Math.log10(min) - 0.1;
    const logMax = Math.log10(max) + 0.1;
    const nTicks = 7;
    const step = (logMax - logMin) / (nTicks - 1);
    yTicks = Array.from({ length: nTicks }, (_, i) => Math.pow(10, logMin + i * step));
    yTickText = yTicks.map((v: number) => {
      if (v >= 1e12) return (v / 1e12).toFixed(2).replace(/\.00$/, '') + 'T';
      if (v >= 1e9) return (v / 1e9).toFixed(2).replace(/\.00$/, '') + 'B';
      if (v >= 1e6) return (v / 1e6).toFixed(2).replace(/\.00$/, '') + 'M';
      if (v >= 1e3) return (v / 1e3).toFixed(2).replace(/\.00$/, '') + 'K';
      return v.toFixed(0);
    });
  }

  return (
    <div className="w-full relative" style={{ maxWidth: 1440, margin: '0 auto', background: '#000' }}>
      <Plot
        data={[
          { ...marketTrace, yaxis: 'y', xaxis: 'x' },
          { ...realizedTrace, yaxis: 'y', xaxis: 'x' },
          { ...mvrvTrace, yaxis: 'y2', xaxis: 'x2' },
        ] as any[]}
        layout={{
          height: typeof height === 'number' ? height : parseInt(height, 10),
          paper_bgcolor: '#000',
          plot_bgcolor: '#000',
          font: { color: '#fff', family: 'Inter, sans-serif', size: 14 },
          margin: { l: 40, r: 80, t: 40, b: 40 },
          grid: { rows: 2, columns: 1, pattern: 'independent' },
          xaxis: {
            type: 'date',
            showgrid: false,
            gridcolor: '#222',
            tickcolor: '#222',
            ticks: 'outside',
            showline: false,
            linecolor: '#222',
            linewidth: 1,
            zeroline: false,
            side: 'bottom',
            anchor: 'y',
            domain: [0, 1],
            showticklabels: false,
          },
          yaxis: {
            title: '',
            type: 'log',
            showgrid: false,
            gridcolor: '#222',
            tickcolor: '#222',
            ticks: 'outside',
            showline: true,
            linecolor: '#222',
            linewidth: 1,
            zeroline: false,
            tickvals: yTicks,
            ticktext: yTickText,
            side: 'right',
            anchor: 'x',
            domain: [0.57, 0.96],
            nticks: 8,
          },
          xaxis2: {
            type: 'date',
            showgrid: false,
            gridcolor: '#222',
            tickcolor: '#222',
            ticks: 'outside',
            showline: true,
            linecolor: '#222',
            linewidth: 1,
            zeroline: false,
            side: 'bottom',
            anchor: 'y2',
            domain: [0, 1],
            matches: 'x',
          },
          yaxis2: {
            title: '',
            type: 'linear',
            showgrid: false,
            gridcolor: '#222',
            tickcolor: '#222',
            ticks: 'outside',
            showline: true,
            linecolor: '#222',
            linewidth: 1,
            zeroline: false,
            side: 'right',
            anchor: 'x2',
            domain: [0.04, 0.45],
            nticks: 8,
          },
          showlegend: false,
          dragmode: 'pan',
          shapes: [
            {
              type: 'line',
              xref: 'paper',
              yref: 'y2',
              x0: 0,
              x1: 1,
              y0: 1,
              y1: 1,
              line: {
                color: '#ffffff',
                width: 1,
                dash: 'dot',
              },
            },
          ],
        } as Partial<Layout>}
        config={{
          responsive: true,
          displayModeBar: true,
          displaylogo: false,
          modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d', 'toggleSpikelines'],
          toImageButtonOptions: {
            format: 'png',
            filename: 'mvrv-template',
            height: 700,
            width: 1440,
            scale: 2,
          },
        }}
        useResizeHandler={true}
        style={{ width: '100%', height: '100%' }}
      />
      <style jsx global>{`
        .js-plotly-plot .modebar {
          opacity: 0.05;
          pointer-events: auto;
          transition: opacity 0.2s;
        }
        .js-plotly-plot .modebar:hover {
          opacity: 1;
          pointer-events: auto;
        }
      `}</style>
    </div>
  );
};

export default PlotlyMVRVTemplate; 