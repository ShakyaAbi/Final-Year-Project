import React, { useState, useEffect } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Scatter,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Indicator, IndicatorType, CategoryDefinition } from "../types";
import { AlertTriangle } from "lucide-react";
import { api } from "../services/api";

interface IndicatorChartsProps {
  indicator: Indicator;
}

const formatDate = (value?: string) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    timeZone: "UTC",
  });
};

const parseNumericValue = (value: unknown): number | null => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/,/g, "");
  const direct = Number(normalized);
  if (Number.isFinite(direct)) return direct;
  const match = normalized.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isForecast = data.isForecast;
    const valueEntry = payload.find(
      (entry: any) =>
        entry.dataKey === "value" && Number.isFinite(Number(entry.value)),
    );
    const forecastEntry = payload.find(
      (entry: any) =>
        entry.dataKey === "forecast" && Number.isFinite(Number(entry.value)),
    );
    const displayValue = Number.isFinite(Number(valueEntry?.value))
      ? Number(valueEntry.value)
      : Number.isFinite(Number(data.value))
        ? Number(data.value)
        : null;
    const displayForecast = Number.isFinite(Number(forecastEntry?.value))
      ? Number(forecastEntry.value)
      : Number.isFinite(Number(data.forecast))
        ? Number(data.forecast)
        : null;

    return (
      <div
        className={`bg-white p-0 border shadow-xl rounded-lg overflow-hidden min-w-[220px] ${
          data.isAnomaly
            ? "border-red-200 ring-2 ring-red-50"
            : "border-slate-200"
        }`}
      >
        <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-700">
            {formatDate(data.date)}
          </span>
          {isForecast && (
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 uppercase tracking-wider">
              Forecast
            </span>
          )}
        </div>

        <div className="p-4 space-y-3">
          {displayValue !== null && (
            <div className="text-sm flex items-center justify-between gap-6">
              <span className="flex items-center text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 rounded-full mr-2.5 bg-blue-500"></span>
                Actual Value
              </span>
              <span className="font-bold text-slate-900 font-mono text-base">
                {displayValue.toFixed(2)}
              </span>
            </div>
          )}

          {(isForecast || displayForecast !== null) && (
            <div className="text-sm flex items-center justify-between gap-6">
              <span className="flex items-center text-slate-600 font-medium">
                <span className="w-2.5 h-2.5 border-2 border-blue-400 border-dashed rounded-full mr-2.5"></span>
                Forecast
              </span>
              <span className="font-bold text-blue-600 font-mono text-base">
                {(displayForecast ?? 0).toFixed(2)}
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
                <span className="text-xs font-bold text-red-800 uppercase tracking-wider block mb-1">
                  Anomaly Detected
                </span>
                <p className="text-xs text-red-600 leading-relaxed font-medium">
                  {data.anomalyReason || "Anomaly detected"}
                </p>
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
  const validData = historicalData.filter((d) =>
    Number.isFinite(parseNumericValue(d.value)),
  );
  if (validData.length < 2) return [];

  const n = validData.length;
  let sumX = 0,
    sumY = 0,
    sumXY = 0,
    sumXX = 0;

  validData.forEach((point, i) => {
    const val = parseNumericValue(point.value) ?? 0;
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
    value: parseNumericValue(lastActual.value),
    forecast: parseNumericValue(lastActual.value), // Connect lines
    isForecast: false,
  });

  for (let i = 1; i <= periods; i++) {
    const nextDate = new Date(lastDate);
    nextDate.setDate(lastDate.getDate() + i * 7); // Weekly steps

    const x = n - 1 + i; // x index for regression
    const predictedValue = slope * x + intercept;

    forecast.push({
      date: nextDate.toISOString().split("T")[0],
      forecast: parseFloat(predictedValue.toFixed(2)),
      value: null, // No actual value
      isForecast: true,
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
      <text
        x={cx}
        y={cy + 5}
        textAnchor="middle"
        fill="white"
        fontSize="11"
        fontWeight="800"
        className="pointer-events-none"
      >
        !
      </text>
    </g>
  );
};

export const IndicatorCharts: React.FC<IndicatorChartsProps> = ({
  indicator,
}) => {
  const [categoryData, setCategoryData] = useState<
    Array<{ name: string; value: number; color: string }>
  >([]);
  const [loading, setLoading] = useState(false);

  const isNumeric =
    indicator.type === IndicatorType.NUMBER ||
    indicator.type === IndicatorType.PERCENTAGE ||
    indicator.type === IndicatorType.CURRENCY;

  const isCategorical = indicator.type === IndicatorType.CATEGORICAL;
  const categoryIndexMap = new Map<string, number>();
  (indicator.categories || []).forEach((cat, idx) => {
    const position = idx + 1;
    categoryIndexMap.set(cat.id, position);
    categoryIndexMap.set(String(cat.id).toLowerCase(), position);
    categoryIndexMap.set(String(cat.label).toLowerCase(), position);
  });
  const parseCategoryIds = (value?: string) =>
    String(value || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
  const getCategoryLabel = (id: string) =>
    indicator.categories?.find((cat) => cat.id === id)?.label || id;
  const formatCategoryValue = (value?: string) => {
    const ids = parseCategoryIds(value);
    if (ids.length === 0) return "N/A";
    return ids.map(getCategoryLabel).join(", ");
  };
  const getChartValue = (entry: {
    value: number | string;
    categoryValue?: string;
  }): number | null => {
    const numeric = parseNumericValue(entry.value);
    if (numeric !== null) return numeric;
    if (!isCategorical) return null;
    const ids = parseCategoryIds(
      entry.categoryValue || (typeof entry.value === "string" ? entry.value : ""),
    );
    const firstId = ids[0];
    if (!firstId) return null;
    const byId = categoryIndexMap.get(firstId);
    if (byId !== undefined) return byId;
    const byLower = categoryIndexMap.get(String(firstId).toLowerCase());
    if (byLower !== undefined) return byLower;
    const parsed = Number(firstId);
    if (
      Number.isFinite(parsed) &&
      parsed >= 1 &&
      parsed <= Math.max(1, (indicator.categories || []).length)
    ) {
      return parsed;
    }
    return null;
  };

  // Fetch category distribution for categorical indicators
  useEffect(() => {
    if (isCategorical && indicator.id) {
      setLoading(true);
      api
        .getCategoryDistribution(indicator.id)
        .then((response) => {
          const distribution = response.distribution || [];
          const categoryMap = new Map(
            (indicator.categories || []).map((cat: CategoryDefinition) => [
              cat.id,
              cat,
            ]),
          );

          const chartData = distribution.map((item: any) => {
            const category = categoryMap.get(item.categoryId) as
              | CategoryDefinition
              | undefined;
            return {
              name: category?.label || item.categoryId,
              value: item.count,
              color: category?.color || "#64748b",
            };
          });

          setCategoryData(chartData);
        })
        .catch((err) => {
          console.error("Failed to fetch category distribution:", err);
          setCategoryData([]);
        })
        .finally(() => setLoading(false));
    }
  }, [isCategorical, indicator.id, indicator.categories]);

  const showNumeric = isNumeric || isCategorical;

  const renderCategoryChart = () => {
    if (!isCategorical) return null;
    if (loading) {
      return (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">
            Loading category distribution...
          </p>
        </div>
      );
    }

    if (categoryData.length === 0) {
      return (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">
            No data available for categorical chart. Submit some values to see
            the distribution.
          </p>
        </div>
      );
    }

    const totalCount = categoryData.reduce((sum, item) => sum + item.value, 0);

    return (
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Category Distribution
            </h3>
            <p className="text-xs text-slate-500">
              {totalCount} total submission{totalCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-1 font-semibold">
              Donut view
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-center">
          <div className="relative">
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={75}
                  outerRadius={125}
                  paddingAngle={3}
                  stroke="#ffffff"
                  strokeWidth={2}
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => {
                    const pct = totalCount
                      ? Math.round((value / totalCount) * 100)
                      : 0;
                    return [`${value} (${pct}%)`, name];
                  }}
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "10px",
                    padding: "10px 12px",
                    boxShadow: "0 12px 24px rgba(15, 23, 42, 0.08)",
                  }}
                />
                <text
                  x="50%"
                  y="50%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  <tspan
                    className="fill-slate-500"
                    fontSize="12"
                    fontWeight="600"
                  >
                    TOTAL
                  </tspan>
                  <tspan
                    x="50%"
                    dy="18"
                    className="fill-slate-900"
                    fontSize="22"
                    fontWeight="700"
                  >
                    {totalCount}
                  </tspan>
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid gap-3">
            {categoryData.map((item) => {
              const pct = totalCount
                ? Math.round((item.value / totalCount) * 100)
                : 0;
              return (
                <div
                  key={item.name}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        {item.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {pct}% of total
                      </div>
                    </div>
                  </div>
                  <div className="text-sm font-semibold text-slate-700">
                    {item.value}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const inferAnomalyReason = (
    value: number,
    existing?: string,
    isAnomaly?: boolean,
    score?: number,
    threshold?: number,
  ) => {
    if (!isAnomaly) return "";
    const suffix =
      score !== undefined && threshold !== undefined
        ? ` (score: ${score.toFixed(3)}, threshold: ${threshold.toFixed(3)})`
        : "";
    if (existing && existing.trim()) return `${existing}${suffix}`;
    if (indicator.type === IndicatorType.PERCENTAGE) {
      const lower = indicator.minExpected ?? 0;
      const upper = indicator.maxExpected ?? 100;
      if (value < lower || value > upper) {
        return `Percent must be between ${lower} and ${upper}${suffix}`;
      }
    }
    if (
      indicator.type === IndicatorType.NUMBER ||
      indicator.type === IndicatorType.CURRENCY
    ) {
      if (
        indicator.minExpected !== undefined &&
        value < indicator.minExpected
      ) {
        return `Value below expected minimum (${indicator.minExpected})${suffix}`;
      }
      if (
        indicator.maxExpected !== undefined &&
        value > indicator.maxExpected
      ) {
        return `Value exceeds expected maximum (${indicator.maxExpected})${suffix}`;
      }
    }
    return `Anomaly detected${suffix}`;
  };

  const renderNumericChart = () => {
    if (!showNumeric) {
      return (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">
            Charts are available for numeric and categorical indicators only.
          </p>
        </div>
      );
    }

    const sortedValues = [...indicator.values]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((v) => {
        const numericValue = getChartValue(v);
        return {
          ...v,
          value: numericValue,
          anomalyReason: inferAnomalyReason(
            numericValue ?? Number.NaN,
            v.anomalyReason,
            v.isAnomaly,
            v.anomalyScore,
            v.anomalyThreshold,
          ),
        };
      }); // Ensure numeric values

    const latestValue = sortedValues[sortedValues.length - 1]?.value ?? 0;
    const latestSubmission = sortedValues[sortedValues.length - 1];
    const latestCategoryIds = parseCategoryIds(latestSubmission?.categoryValue);
    const targetCategoryIds = parseCategoryIds(indicator.targetCategory);
    const hasCategoricalTarget = targetCategoryIds.length > 0;
    const categoricalMatchedCount = targetCategoryIds.filter((id) =>
      latestCategoryIds.includes(id),
    ).length;

    const currentValNum = parseNumericValue(latestValue);
    const targetNum = Number(indicator.target);
    const hasNumericTarget = Number.isFinite(targetNum) && targetNum > 0;
    const numericProgress =
      hasNumericTarget && currentValNum !== null
        ? Math.min(Math.max((currentValNum / targetNum) * 100, 0), 100)
        : 0;
    const categoricalProgress = hasCategoricalTarget
      ? Math.min(
          Math.max((categoricalMatchedCount / targetCategoryIds.length) * 100, 0),
          100,
        )
      : 0;
    const progress = isCategorical ? categoricalProgress : numericProgress;

    const combinedData = [
      ...sortedValues.map((v) => ({ ...v, forecast: null })),
    ];
    const predictions = generateForecast(sortedValues);
    const hasForecast = predictions.length > 1;

    if (combinedData.length > 0) {
      const lastIdx = combinedData.length - 1;
      combinedData[lastIdx].forecast = combinedData[lastIdx].value;
      if (hasForecast) {
        for (let i = 1; i < predictions.length; i++) {
          combinedData.push({
            ...predictions[i],
            value: null,
          } as any);
        }
      }
    }

    // Isolate anomalies for Scatter plot to ensure specific rendering
    const anomalyData = combinedData.filter(
      (d) => d.isAnomaly && Number.isFinite(parseNumericValue(d.value)),
    );

    // Calculate Y Axis Domain padding to make the chart look better
    const allValues = combinedData
      .filter((d) => d.value !== null && Number.isFinite(Number(d.value)))
      .map((d) => Number(d.value));
    if (allValues.length === 0) allValues.push(0);

    const nonAnomalyValues = combinedData
      .filter(
        (d) =>
          !d.isAnomaly && d.value !== null && Number.isFinite(Number(d.value)),
      )
      .map((d) => Number(d.value));

    const domainValues =
      nonAnomalyValues.length > 1 ? nonAnomalyValues : allValues;

    const maxDataVal = Math.max(...domainValues);
    const minDataVal = Math.min(...domainValues);

    // Include target and baseline in domain calculation
    const domainMax = Math.max(
      maxDataVal,
      hasNumericTarget ? targetNum : 0,
      Number(indicator.baseline) || 0,
    );
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
              <span
                className={`font-bold text-slate-900 ${
                  isCategorical ? "text-lg leading-snug" : "text-3xl"
                }`}
              >
                {isCategorical
                  ? latestSubmission?.categoryValue
                    ? formatCategoryValue(latestSubmission.categoryValue)
                    : "No data"
                  : latestValue}
              </span>
              <span className="text-sm text-slate-400 mb-1">
                /{" "}
                {isCategorical
                  ? hasCategoricalTarget
                    ? formatCategoryValue(indicator.targetCategory)
                    : "No target category"
                  : hasNumericTarget
                    ? indicator.target
                    : "No target"}
              </span>
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm md:col-span-2">
            <p className="text-sm text-slate-500 font-medium mb-4">
              {isCategorical ? "Category Match to Target" : "Progress to Target"}
            </p>
            <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`absolute top-0 left-0 h-full transition-all duration-1000 ${
                  progress >= 100 ? "bg-green-500" : "bg-blue-500"
                }`}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-400 font-medium">
              <span>
                Baseline:{" "}
                {isCategorical
                  ? formatCategoryValue(indicator.baselineCategory)
                  : indicator.baseline}
              </span>
              <span>
                Target:{" "}
                {isCategorical
                  ? hasCategoricalTarget
                    ? formatCategoryValue(indicator.targetCategory)
                    : "No target set"
                  : hasNumericTarget
                    ? indicator.target
                    : "No target set"}
              </span>
            </div>
          </div>
        </div>

        {/* Time Series Chart */}
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-96">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-bold text-slate-900">
              Performance Trend & Prediction
            </h3>
            <div className="flex items-center space-x-4 text-xs">
              <span className="flex items-center">
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full mr-1.5"></span>{" "}
                Actual
              </span>
              {hasForecast && (
                <span className="flex items-center">
                  <span className="w-2.5 h-2.5 border-2 border-blue-400 border-dashed rounded-full mr-1.5"></span>{" "}
                  Forecast
                </span>
              )}
              {anomalyData.length > 0 && (
                <span className="flex items-center">
                  <span className="flex items-center justify-center w-4 h-4 bg-red-500 text-[8px] text-white rounded-sm mr-1.5 font-bold">
                    !
                  </span>{" "}
                  Anomaly
                </span>
              )}
            </div>
          </div>

          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={combinedData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4d66ff" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#4d66ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#f1f5f9"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
                minTickGap={30}
                tickFormatter={(value) => formatDate(value)}
              />
              <YAxis
                domain={[yAxisMin, yAxisMax]}
                allowDataOverflow
                tick={{ fontSize: 11, fill: "#64748b" }}
                tickLine={false}
                axisLine={{ stroke: "#e2e8f0" }}
                width={40}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  stroke: "#94a3b8",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
              />

              {hasNumericTarget && (
                <ReferenceLine
                  y={targetNum}
                  label={{
                    value: "Target",
                    position: "insideTopRight",
                    fill: "#10b981",
                    fontSize: 12,
                  }}
                  stroke="#10b981"
                  strokeDasharray="3 3"
                />
              )}
              <ReferenceLine
                y={Number(indicator.baseline)}
                label={{
                  value: "Baseline",
                  position: "insideBottomRight",
                  fill: "#94a3b8",
                  fontSize: 12,
                }}
                stroke="#cbd5e1"
                strokeDasharray="3 3"
              />

              {/* Actual Area Chart with Gradient */}
              <Area
                type="monotone"
                dataKey="value"
                stroke="#4d66ff"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorValue)"
                name="Actual Value"
                connectNulls={false}
                dot={{ r: 3, fill: "#4d66ff", stroke: "#4d66ff" }}
              />

              {/* Forecast Line */}
              {hasForecast && (
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
              )}

              {/* Anomaly Custom Shape */}
              {anomalyData.length > 0 && (
                <Scatter
                  name="Anomaly"
                  data={anomalyData}
                  dataKey="value"
                  shape={<CustomAnomalyShape />}
                  legendType="triangle"
                  zAxisId={0}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {renderCategoryChart()}
      {renderNumericChart()}
    </div>
  );
};
