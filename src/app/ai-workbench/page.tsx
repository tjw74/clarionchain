'use client';
import { useState } from 'react';
import { ResizablePanel, ResizablePanelGroup, ResizableHandle } from "@/components/ui/resizable";
import dynamic from 'next/dynamic';

// Dynamic import for Chart.js to ensure SSR safety
const PriceModelsChart = dynamic(() => import('@/components/PriceModelsChart'), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full text-white">Loading chart...</div>
});

const metricGroups = [
  { name: 'Price Models' },
  { name: 'Profit & Loss' },
  { name: 'Network Activity' },
];

export default function AIWorkbench() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const handlePrev = () => setSelectedIndex(i => Math.max(i - 1, 0));
  const handleNext = () => setSelectedIndex(i => Math.min(i + 1, metricGroups.length - 1));

  return (
    <div className="bg-black text-white min-h-screen w-full flex flex-col border-b border-white/20">
      <header className="py-8 border-b border-white/20 w-full flex items-center justify-between px-8">
        <h1 className="text-3xl font-bold">AI Workbench</h1>
        {/* Metric group navigation - moved to top right */}
        <div className="flex items-center gap-2">
          <button onClick={handlePrev} disabled={selectedIndex === 0} className="px-3 py-1 rounded border border-white/20 bg-black text-white disabled:opacity-40">&lt;</button>
          <select
            value={selectedIndex}
            onChange={e => setSelectedIndex(Number(e.target.value))}
            className="bg-black border border-white/20 text-white rounded px-2 py-1"
          >
            {metricGroups.map((group, i) => (
              <option key={group.name} value={i}>{group.name}</option>
            ))}
          </select>
          <button onClick={handleNext} disabled={selectedIndex === metricGroups.length - 1} className="px-3 py-1 rounded border border-white/20 bg-black text-white disabled:opacity-40">&gt;</button>
        </div>
      </header>
      <div className="flex flex-col flex-1 p-4 gap-4">
        {/* 4 resizable quadrants */}
        <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0 border border-white/20 bg-black">
          {/* Left side (vertical split) */}
          <ResizablePanel defaultSize={50} minSize={20} className="min-w-0">
            <ResizablePanelGroup direction="vertical" className="h-full min-h-0">
              {/* Top Left - Price Models Chart */}
              <ResizablePanel defaultSize={50} minSize={20} className="min-h-0">
                <div className="h-full w-full p-2 bg-black border-b border-white/20">
                  {selectedIndex === 0 && <PriceModelsChart className="h-full w-full" />}
                  {selectedIndex !== 0 && (
                    <div className="flex flex-col h-full w-full items-center justify-center">
                      <span className="text-white text-lg font-semibold">Top Left ({metricGroups[selectedIndex].name})</span>
                    </div>
                  )}
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle className="border border-white/20 border-[1px]" />
              {/* Bottom Left */}
              <ResizablePanel defaultSize={50} minSize={20} className="min-h-0">
                <div className="flex flex-col h-full w-full items-center justify-center p-2 bg-black">
                  <span className="text-white text-lg font-semibold">Bottom Left ({metricGroups[selectedIndex].name})</span>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
          <ResizableHandle withHandle className="border border-white/20 border-[1px]" />
          {/* Right side (vertical split) */}
          <ResizablePanel defaultSize={50} minSize={20} className="min-w-0">
            <ResizablePanelGroup direction="vertical" className="h-full min-h-0">
              {/* Top Right */}
              <ResizablePanel defaultSize={50} minSize={20} className="min-h-0">
                <div className="flex flex-col h-full w-full items-center justify-center p-2 bg-black border-b border-white/20">
                  <span className="text-white text-lg font-semibold">Top Right ({metricGroups[selectedIndex].name})</span>
                </div>
              </ResizablePanel>
              <ResizableHandle withHandle className="border border-white/20 border-[1px]" />
              {/* Bottom Right */}
              <ResizablePanel defaultSize={50} minSize={20} className="min-h-0">
                <div className="flex flex-col h-full w-full items-center justify-center p-2 bg-black">
                  <span className="text-white text-lg font-semibold">Bottom Right ({metricGroups[selectedIndex].name})</span>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </div>
  );
} 