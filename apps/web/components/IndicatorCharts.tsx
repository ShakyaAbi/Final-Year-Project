import React, { useState, useEffect } from 'react';
import { 
  ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Scatter, ReferenceLine,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Indicator, IndicatorType, CategoryDefinition } from '../types';
import { AlertTriangle } from 'lucide-react';
import { api } from '../services/api';

interface IndicatorChartsProps {
  indicator: Indicator;
}

const formatDate = (value?: string) => {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit', timeZone: 'UTC' });
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isForecast = data.isForecast;

    return (
      <div className={`bg-white p-0 border shadow-xl rounded-lg overflow-hidden min-w-[220px] ${data.isAnomaly ? 'border-red-200 ring-2 ring-red-50' : 'border-slate-200'}`}>
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
           <span className="text-sm font-semibold text-slate-700">{formatDate(data.date)}</span>
           {isForecast && <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-wider">Forecast</span>}
        </div>

        <div className="p-4 space-y-3">
            {payload
              .filter((entry: any) => entry.name !== 'Anomaly' && entry.name !== 'Predictive Trend')
              .filter((entry: any) => Number.isFinite(Number(entry.value)))
              .map((entry: any) => (
            <div key={entry.dataKey} className="text-sm flex items-center justify-between gap-6">
                <span className="flex items-center text-slate-600 font-medium">
                    <span className="w-2.5 h-2.5 rounded-full mr-2.5" style={{ backgroundColor: entry.color }}></span>
                    {entry.name}
                </span>
                <span className="font-bold text-slate-900 font-mono text-base">
                  {Number(entry.value).toFixed(2)}
                </span>
            </div>
            ))}

             {/* Special handling for Forecast tooltip since it might be separate */}
             {isForecast && payload.find((e: any) => e.name === 'Predictive Trend') && (
                <div className="text-sm flex items-center justify-between gap-6">
                  <span className="flex items-center text-slate-600 font-medium">
                      <span className="w-2.5 h-2.5 border-2 border-blue-400 border-dashed rounded-full mr-2.5"></span>
                      Forecast
                  </span>
                  <span className="font-bold text-blue-600 font-mono text-base">
                    {Number(data.forecast).toFixed(2)}
                  </span>
                </div>
             )}
        </div>

        {data.isAnomaly && (
          <div className="bg-red-50 border-t border-red-100 p-4 animate-in slide-in-from-top-2 duration-200">
            <div className="flex items-start gap-3">
                 <div className="bg-white p-1.5 rounded-full text-red-600 shadow-sm ring-1 ring-red-100 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                 </div>
                 <div>
                    <span className="text-xs font-bold text-red-800 uppercase tracking-wider block mb-1">Anomaly Detected</span>
                    <p className="text-xs text-red-600 leading-relaxed font-medium">{data.anomalyReason || 'Anomaly detected'}</p>
                 </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  return null;
};

// Simple Linear Regression to predict next values
const generateForecast = (historicalData: any[], periods = 4) => {
  if (historicalData.length < 2) return [];

  // Filter valid numbers
  const validData = historicalData.filter(d => !isNaN(Number(d.value)));
  if (validData.length < 2) return [];

  const n = validData.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  validData.forEach((point, i) => {
    const val = Number(point.value);
    sumX += i;
    sumY += val;
    sumXY += i * val;
    sumXX += i * i;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const lastDate = new Date(historicalData[historicalData.length - 1].date);
  const forecast = [];

  // Start from the last actual point to connect the lines
  const lastActual = historicalData[historicalData.length - 1];
  forecast.push({
    ...lastActual,
    value: Number(lastActual.value),
    forecast: Number(lastActual.value), // Connect lines
    isForecast: false
  });

  for (let i = 1; i <= periods; i++) {
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + (i * 7)); // Weekly steps

    const x = n - 1 + i; // x index for regression
    const predictedValue = slope * x + intercept;

    forecast.push({
      date: nextDate.toISOString().split('T')[0],
      forecast: parseFloat(predictedValue.toFixed(2)),
      value: null, // No actual value
      isForecast: true
    });
  }

  return forecast;
};

const CustomAnomalyShape = (props: any) => {
    const { cx, cy } = props;
    if (!cx || !cy) return null;

    return (
        <g className="drop-shadow-sm hover:drop-shadow-md cursor-pointer group">
             <path
                d={`M${cx} ${cy - 14} L${cx + 12} ${cy + 10} L${cx - 12} ${cy + 10} Z`}
                fill="#ef4444"
                stroke="#fff"
                strokeWidth="2"
                strokeLinejoin="round"
                className="transition-transform duration-200 group-hover:scale-110 origin-center"
            />
            <text x={cx} y={cy + 5} textAnchor="middle" fill="white" fontSize="11" fontWeight="800" className="pointer-events-none">!</text>
        </g>
    );
};

export const IndicatorCharts: React.FC<IndicatorChartsProps> = ({ indicator }) => {
  const [categoryData, setCategoryData] = useState<Array<{name: string, value: number, color: string}>>([]);
  const [loading, setLoading] = useState(false);
  
  const isNumeric =
    indicator.type === IndicatorType.NUMBER ||
    indicator.type === IndicatorType.PERCENTAGE ||
    indicator.type === IndicatorType.CURRENCY;

  const isCategorical = indicator.type === IndicatorType.CATEGORICAL;

  // Fetch category distribution for categorical indicators
  useEffect(() => {
    if (isCategorical && indicator.id) {
      setLoading(true);
      api.getCategoryDistribution(indicator.id)
        .then(response => {
          const distribution = response.distribution || [];
          const categoryMap = new Map(
            (indicator.categories || []).map((cat: CategoryDefinition) => [cat.id, cat])
          );
          
          const chartData = distribution.map((item: any) => ({
            name: categoryMap.get(item.categoryId)?.label || item.categoryId,
            value: item.count,
            color: categoryMap.get(item.categoryId)?.color || '#64748b'
          }));
          
          setCategoryData(chartData);
        })
        .catch(err => {
          console.error('Failed to fetch category distribution:', err);
          setCategoryData([]);
        })
        .finally(() => setLoading(false));
    }
  }, [isCategorical, indicator.id, indicator.categories]);

  // Render pie chart for categorical indicators
  if (isCategorical) {
    if (loading) {
      return (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">Loading category distribution...</p>
        </div>
      );
    }
    
    if (categoryData.length === 0) {
      return (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">No data available for categorical chart. Submit some values to see the distribution.</p>
        </div>
      );
    }

    return (
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Category Distribution</h3>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={categoryData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(entry) => `${entry.name}: ${entry.value}`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'white', 
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '8px 12px'
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // For non-numeric, non-categorical types
  if (!isNumeric) {
    return (
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <p className="text-sm text-slate-500">Charts are available for numeric and categorical indicators only.</p>
      </div>
    );
  }

  const inferAnomalyReason = (value: number, existing?: string, isAnomaly?: boolean) => {
    if (!isAnomaly) return '';
    if (existing && existing.trim()) return existing;
    if (indicator.type === IndicatorType.PERCENTAGE) {
      const lower = indicator.minExpected ?? 0;
      const upper = indicator.maxExpected ?? 100;
      if (value < lower || value > upper) {
        return `Percent must be between ${lower} and ${upper}`;
      }
    }
    if (indicator.type === IndicatorType.NUMBER || indicator.type === IndicatorType.CURRENCY) {
      if (indicator.minExpected !== undefined && value < indicator.minExpected) {
        return `Value below expected minimum (${indicator.minExpected})`;
      }
      if (indicator.maxExpected !== undefined && value > indicator.maxExpected) {
        return `Value exceeds expected maximum (${indicator.maxExpected})`;
      }
    }
    return 'Anomaly detected';
  };

  const sortedValues = [...indicator.values]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map(v => {
      const numericValue = Number(v.value);
      return {
        ...v,
        value: numericValue,
        anomalyReason: inferAnomalyReason(numericValue, v.anomalyReason, v.isAnomaly)
      };
    }); // Ensure numeric values

  const latestValue = sortedValues[sortedValues.length - 1]?.value || 0;

  const currentValNum = Number(latestValue);
  const targetNum = Number(indicator.target);
  const progress = (targetNum && !isNaN(currentValNum) && !isNaN(targetNum))
    ? Math.min(Math.max((currentValNum / targetNum) * 100, 0), 100)
    : 0;

  const combinedData = [...sortedValues.map(v => ({ ...v, forecast: null }))];
  
  if (combinedData.length > 0) {
      const lastIdx = combinedData.length - 1;
      combinedData[lastIdx].forecast = combinedData[lastIdx].value;
      
      const predictions = generateForecast(sortedValues);
      
      for (let i = 1; i < predictions.length; i++) {
          combinedData.push({
              ...predictions[i],
              value: null
          } as any);
      }
  }

  // Isolate anomalies for Scatter plot to ensure specific rendering
  const anomalyData = combinedData.filter(d => d.isAnomaly);

  // Calculate Y Axis Domain padding to make the chart look better
  const allValues = combinedData.filter(d => d.value !== null).map(d => Number(d.value));
  if (allValues.length === 0) allValues.push(0);
  
  const maxDataVal = Math.max(...allValues);
  const minDataVal = Math.min(...allValues);
  
  // Include target and baseline in domain calculation
  const domainMax = Math.max(maxDataVal, Number(indicator.target), Number(indicator.baseline) || 0);
  const domainMin = Math.min(minDataVal, Number(indicator.baseline) || 0);
  
  // Add padding (15% top/bottom)
  const yAxisMax = Math.ceil(domainMax * 1.15);
  // If domainMin is close to 0, let it be 0, else give padding
  const yAxisMin = domainMin < 5 ? 0 : Math.floor(domainMin * 0.85);

  return (
    <div className="space-y-8">

      {/* Progress Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500 font-medium">Current Value</p>
          <div className="flex items-end space-x-2 mt-1">
            <span className="text-3xl font-bold text-slate-900">{latestValue}</span>
            <span className="text-sm text-slate-400 mb-1">/ {indicator.target}</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm md:col-span-2">
           <p className="text-sm text-slate-500 font-medium mb-4">Progress to Target</p>
           <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full transition-all duration-1000 ${progress >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${progress}%` }}
              ></div>
           </div>
           <div className="flex justify-between mt-2 text-xs text-slate-400 font-medium">
             <span>Baseline: {indicator.baseline}</span>
             <span>Target: {indicator.target}</span>
           </div>
        </div>
      </div>

      {/* Time Series Chart */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-96">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-900">Performance Trend & Prediction</h3>
            <div className="flex items-center space-x-4 text-xs">
                <span className="flex items-center"><span className="w-2.5 h-2.5 bg-blue-500 rounded-full mr-1.5"></span> Actual</span>
                <span className="flex items-center"><span className="w-2.5 h-2.5 border-2 border-blue-400 border-dashed rounded-full mr-1.5"></span> Forecast</span>
                <span className="flex items-center"><span className="flex items-center justify-center w-4 h-4 bg-red-500 text-[8px] text-white rounded-sm mr-1.5 font-bold">!</span> Anomaly</span>
            </div>
        </div>
        
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={combinedData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
                dataKey="date" 
                tick={{fontSize: 11, fill: '#64748b'}} 
                tickLine={false} 
                axisLine={{ stroke: '#e2e8f0' }}
                minTickGap={30}
                tickFormatter={(value) => formatDate(value)}
            />
            <YAxis 
                domain={[yAxisMin, yAxisMax]}
                tick={{fontSize: 11, fill: '#64748b'}} 
                tickLine={false} 
                axisLine={{ stroke: '#e2e8f0' }}
                width={40}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} />
            
            <ReferenceLine y={Number(indicator.target)} label={{ value: 'Target', position: 'insideTopRight', fill: '#10b981', fontSize: 12 }} stroke="#10b981" strokeDasharray="3 3" />
            <ReferenceLine y={Number(indicator.baseline)} label={{ value: 'Baseline', position: 'insideBottomRight', fill: '#94a3b8', fontSize: 12 }} stroke="#cbd5e1" strokeDasharray="3 3" />
            
            {/* Actual Area Chart with Gradient */}
            <Area 
                type="monotone" 
                dataKey="value" 
                stroke="#3b82f6" 
                strokeWidth={2.5} 
                fillOpacity={1} 
                fill="url(#colorValue)" 
                name="Actual Value"
                connectNulls={false} 
            />
            
            {/* Forecast Line */}
            <Line 
                type="monotone" 
                dataKey="forecast" 
                stroke="#60a5fa" 
                strokeWidth={2} 
                strokeDasharray="5 5"
                dot={false}
                name="Predictive Trend"
                connectNulls={true} 
            />
            
            {/* Anomaly Custom Shape */}
            <Scatter 
                name="Anomaly" 
                data={anomalyData} 
                dataKey="value" 
                shape={<CustomAnomalyShape />}
                legendType="triangle"
                zAxisId={0}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
