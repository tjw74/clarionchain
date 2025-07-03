'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  TimeScale,
  zoomPlugin
);

interface PriceModelsChartProps {
  className?: string;
}

export default function PriceModelsChart({ className }: PriceModelsChartProps) {
  const chartRef = useRef<ChartJS<"line", any, any>>(null);
  const [chartData, setChartData] = useState<any>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Mock data for price models - in real implementation, this would come from API
  const generateMockData = () => {
    const now = new Date();
    const data = [];
    
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      // Generate mock price model data
      const basePrice = 50000;
      const stockToFlow = basePrice * (1 + Math.sin(i * 0.1) * 0.3);
      const rainbow = basePrice * (1 + Math.cos(i * 0.15) * 0.4);
      const realized = basePrice * (1 + Math.sin(i * 0.08) * 0.2);
      
      data.push({
        date: date.toISOString().split('T')[0],
        stockToFlow,
        rainbow,
        realized,
        actual: basePrice * (1 + Math.sin(i * 0.12) * 0.35 + Math.random() * 0.1 - 0.05)
      });
    }
    
    return data;
  };

  useEffect(() => {
    const mockData = generateMockData();
    
    setChartData({
      labels: mockData.map(d => d.date),
      datasets: [
        {
          label: 'Stock-to-Flow',
          data: mockData.map(d => d.stockToFlow),
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.1,
        },
        {
          label: 'Rainbow Chart',
          data: mockData.map(d => d.rainbow),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.1,
        },
        {
          label: 'Realized Price',
          data: mockData.map(d => d.realized),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.1,
        },
        {
          label: 'Actual Price',
          data: mockData.map(d => d.actual),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          borderWidth: 2,
          fill: false,
          tension: 0.1,
        },
      ],
    });
  }, []);

  // Handle resize to fit perfectly in the panel
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: rect.height,
        });
      }
    };

    // Initial measurement
    handleResize();
    
    // Listen for resize events
    window.addEventListener('resize', handleResize);
    
    // Use ResizeObserver for more precise container resize detection
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
    };
  }, []);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // We'll use custom legend
      },
      title: {
        display: true,
        text: 'Bitcoin Price Models',
        color: '#ffffff',
        font: {
          size: 16,
          weight: 'bold' as const,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
        callbacks: {
          label: function(context: TooltipItem<'line'>) {
            return `${context.dataset.label}: $${context.parsed.y.toLocaleString()}`;
          }
        }
      },
      zoom: {
        pan: {
          enabled: true,
          mode: 'x' as const,
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
          mode: 'x' as const,
        },
      },
    },
    scales: {
      x: {
        type: 'time' as const,
        time: {
          unit: 'day' as const,
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#ffffff',
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#ffffff',
          callback: function(value: any) {
            return '$' + value.toLocaleString();
          },
        },
      },
    },
    interaction: {
      intersect: false,
    },
    elements: {
      point: {
        radius: 3,
        hoverRadius: 5,
      },
    },
  };

  if (!chartData) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <span className="text-white text-sm">Loading price models...</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`relative h-full w-full ${className}`}>
      <div className="h-full w-full">
        <Line ref={chartRef} data={chartData} options={options} />
      </div>
      
      {/* Custom Legend - positioned in lower right */}
      <div className="absolute bottom-2 right-2 bg-black/80 border border-white/20 rounded p-2 text-xs">
        <div className="flex flex-col gap-1">
          {chartData.datasets.map((dataset: any, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: dataset.borderColor }}
              />
              <span className="text-white text-xs">{dataset.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}