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
}) => {
  const [data, setData] = useState<any[]>([]);
  const [dates, setDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<[number, number] | null>(null);

  // Fetch and align data
  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      fetch(marketValueEndpoint).then(r => r.json()),
      fetch(realizedValueEndpoint).then(r => r.json()),
    ]).then(([marketArr, realizedArr]) => {
      // Both endpoints return arrays, align by index
      const n = Math.min(marketArr.length, realizedArr.length);
      // Generate date labels from genesis block (2009-01-03)
      const genesisDate = new Date('2009-01-03');
      const dateLabels = Array.from({ length: n }, (_, i) => {
        const d = new Date(genesisDate);
        d.setDate(d.getDate() + i);
        return d.toISOString().slice(0, 10);
      });
      // Find index for Jan 1, 2012
      const jan2012Idx = dateLabels.findIndex(d => d >= '2012-01-01');
      // Calculate MVRV ratio
      const mvrvArr = Array.from({ length: n }, (_, i) => {
        const mv = marketArr[i];
        const rv = realizedArr[i];
        return (typeof mv === 'number' && typeof rv === 'number' && rv !== 0) ? mv / rv : null;
      });
      setDates(dateLabels);
      setData([
        { y: marketArr, name: defaultLabels.market, color: defaultColors.market },
        { y: realizedArr, name: defaultLabels.realized, color: defaultColors.realized },
        { y: mvrvArr, name: defaultLabels.mvrv, color: defaultColors.mvrv },
      ]);
      // Default range: Jan 1, 2012 to latest
      setRange([jan2012Idx !== -1 ? jan2012Idx : 0, n - 1]);
      setLoading(false);
    }).catch(e => {
      setError('Failed to load data');
      setLoading(false);
    });
  }, [marketValueEndpoint, realizedValueEndpoint]);

  if (loading) return <div className="w-full h-[400px] flex items-center justify-center text-white">Loading chart…</div>;
  if (error) return <div className="w-full h-[400px] flex items-center justify-center text-red-400">{error}</div>;

  // Slice data for selected range
  const [minIdx, maxIdx] = range || [0, dates.length - 1];
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

  // Latest values for legend
  const latestMarket = data[0]?.y?.[maxIdx];
  const latestRealized = data[1]?.y?.[maxIdx];
  const latestMvrv = data[2]?.y?.[maxIdx];

  return (
    <div className="w-full relative" style={{ maxWidth: 1440, margin: '0 auto', background: '#000' }}>
      {/* Title, upper left */}
      <div className="absolute left-8 top-6 z-20">
        <span className="text-white text-xl font-semibold">Plotly : MVRV Ratio</span>
      </div>
      <Plot
        data={[
          { ...marketTrace, yaxis: 'y', xaxis: 'x' },
          { ...realizedTrace, yaxis: 'y', xaxis: 'x' },
          { ...mvrvTrace, yaxis: 'y2', xaxis: 'x2' },
        ]}
        layout={
          {
            height: typeof height === 'number' ? height : undefined,
            width: typeof width === 'number' ? width : undefined,
            autosize: typeof width !== 'number',
            paper_bgcolor: '#000',
            plot_bgcolor: '#000',
            font: { color: '#fff', family: 'Inter, sans-serif', size: 14 },
            margin: { l: 40, r: 80, t: 40, b: 40 },
            grid: { rows: 2, columns: 1, pattern: 'independent' },
            xaxis: {
              type: 'date',
              showgrid: true,
              gridcolor: '#222',
              tickcolor: '#222',
              ticks: 'outside',
              showline: true,
              linecolor: '#222',
              zeroline: false,
              side: 'bottom',
              anchor: 'y',
              domain: [0, 1],
            },
            yaxis: {
              title: '',
              type: 'log',
              showgrid: true,
              gridcolor: '#222',
              tickcolor: '#222',
              ticks: 'outside',
              showline: true,
              linecolor: '#222',
              zeroline: false,
              tickformat: '$.2s',
              side: 'right',
              anchor: 'x',
              domain: [0.35, 1],
              nticks: 8,
            },
            xaxis2: {
              type: 'date',
              showgrid: true,
              gridcolor: '#222',
              tickcolor: '#222',
              ticks: 'outside',
              showline: true,
              linecolor: '#222',
              zeroline: false,
              side: 'bottom',
              anchor: 'y2',
              domain: [0, 1],
              matches: 'x',
            },
            yaxis2: {
              title: '',
              type: 'linear',
              showgrid: true,
              gridcolor: '#222',
              tickcolor: '#222',
              ticks: 'outside',
              showline: true,
              linecolor: '#222',
              zeroline: false,
              side: 'right',
              anchor: 'x2',
              domain: [0, 0.28],
              nticks: 8,
            },
            showlegend: false,
            dragmode: 'pan',
          } as Partial<Layout>
        }
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
        style={{ width: '100%', height: typeof height === 'number' ? `${height}px` : height }}
      />
      {/* Custom HTML Legend - bottom right */}
      <div className="absolute bottom-16 right-10 flex flex-row gap-8 items-center justify-end z-10">
        <div className="flex items-center gap-2">
          <span style={{ background: defaultColors.market, borderRadius: '50%', width: 12, height: 12, display: 'inline-block' }}></span>
          <span className="text-white text-sm">{defaultLabels.market}</span>
          <span className="text-white text-xs ml-1 font-mono opacity-80">{latestMarket ? formatUSD(latestMarket) : 'N/A'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ background: defaultColors.realized, borderRadius: '50%', width: 12, height: 12, display: 'inline-block' }}></span>
          <span className="text-white text-sm">{defaultLabels.realized}</span>
          <span className="text-white text-xs ml-1 font-mono opacity-80">{latestRealized ? formatUSD(latestRealized) : 'N/A'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span style={{ background: defaultColors.mvrv, borderRadius: '50%', width: 12, height: 12, display: 'inline-block' }}></span>
          <span className="text-white text-sm">{defaultLabels.mvrv}</span>
          <span className="text-white text-xs ml-1 font-mono opacity-80">{latestMvrv ? formatRatio(latestMvrv) : 'N/A'}</span>
        </div>
      </div>
      {/* Unified Range Slider - bottom of panel */}
      {range && (
        <div className="absolute bottom-2 left-10 right-10 flex flex-col items-center z-20">
          <Range
            values={range}
            step={SLIDER_STEP}
            min={SLIDER_MIN}
            max={dates.length - 1}
            onChange={(vals: number[]) => setRange([vals[0], vals[1]])}
            renderTrack={({ props, children }: { props: React.HTMLAttributes<HTMLDivElement>; children: React.ReactNode }) => (
              <div
                {...props}
                style={{
                  ...props.style,
                  height: '6px',
                  width: '100%',
                  background: getTrackBackground({
                    values: range,
                    colors: ['#222', '#3b82f6', '#222'],
                    min: SLIDER_MIN,
                    max: dates.length - 1,
                  }),
                  borderRadius: '4px',
                }}
              >
                {children}
              </div>
            )}
            renderThumb={({ props }: { props: any }) => {
              const { key, ...rest } = props;
              return (
                <div
                  key={key}
                  {...rest}
                  style={{
                    ...rest.style,
                    height: '22px',
                    width: '22px',
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                    border: '2px solid #3b82f6',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 3,
                  }}
                />
              );
            }}
          />
          <div className="flex flex-row justify-between w-full text-xs text-gray-400 mt-1 font-mono">
            <span>{dates[range[0]]}</span>
            <span>{dates[range[1]]}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlotlyMVRVTemplate; 