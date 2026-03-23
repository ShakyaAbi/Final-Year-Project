import React from "react";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Indicator, IndicatorType } from "../../types";
import {
  formatDate,
  parseNumericValue,
  generateForecast,
  inferAnomalyReason,
} from "./ChartUtils";
import { CustomChartTooltip } from "./CustomChartTooltip";
import { SmallAnomalyMarker } from "./AnomalyMarker";

interface PerformanceTrendChartProps {
  indicator: Indicator;
  isCategorical: boolean;
  categoryIndexMap: Map<string, number>;
  formatCategoryValue: (value?: string) => string;
}

export const PerformanceTrendChart: React.FC<PerformanceTrendChartProps> = ({
  indicator,
  isCategorical,
  categoryIndexMap,
  formatCategoryValue,
}) => {
  const parseCategoryIds = (value?: string) =>
    String(value || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

  const getChartValue = (entry: {
    value: number | string;
    categoryValue?: string;
  }): number | null => {
    const numeric = parseNumericValue(entry.value);
    if (numeric !== null) return numeric;
    if (!isCategorical) return null;
    const ids = parseCategoryIds(
      entry.categoryValue ||
        (typeof entry.value === "string" ? entry.value : ""),
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

  const sortedValues = [...indicator.values]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((v) => {
      const numericValue = getChartValue(v);
      return {
        ...v,
        value: numericValue,
        anomalyReason: inferAnomalyReason(
          indicator,
          numericValue ?? Number.NaN,
          v.anomalyReason,
          v.isAnomaly,
          v.anomalyScore,
          v.anomalyThreshold,
        ),
      };
    });

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

  const combinedData = sortedValues.map((v) => ({ ...v, forecast: null }));
  const predictions = generateForecast(sortedValues, {
    frequency: indicator.frequency,
    method: "EXPONENTIAL_SMOOTHING",
    periods: 6,
  });

  const hasForecast = predictions.length > 1;

  if (combinedData.length > 0) {
    const lastIdx = combinedData.length - 1;
    if (combinedData[lastIdx] && typeof combinedData[lastIdx].value === "number") {
      (combinedData[lastIdx] as any).forecast = combinedData[lastIdx].value;
    } else {
      let lastValidActualValue = null;
      for (let i = sortedValues.length - 1; i >= 0; i--) {
        if (typeof sortedValues[i].value === "number") {
          lastValidActualValue = sortedValues[i].value;
          break;
        }
      }
      if (lastValidActualValue !== null) {
        (combinedData[lastIdx] as any).forecast = lastValidActualValue;
      }
    }

    if (hasForecast) {
      for (let i = 1; i < predictions.length; i++) {
        combinedData.push({ ...predictions[i], value: null });
      }
    }
  }

  const anomalyData = combinedData.filter(
    (d) => d.isAnomaly && Number.isFinite(parseNumericValue(d.value)),
  );

  const allValues = combinedData
    .filter((d) => d.value !== null && Number.isFinite(Number(d.value)))
    .map((d) => Number(d.value));
  if (allValues.length === 0) allValues.push(0);

  const domainMax = Math.max(
    Math.max(...allValues),
    hasNumericTarget ? targetNum : 0,
    Number(indicator.baseline) || 0,
  );
  const domainMin = Math.min(
    Math.min(...allValues),
    Number(indicator.baseline) || 0,
  );

  const yAxisMax = Math.ceil(domainMax * 1.15);
  const yAxisMin = domainMin < 5 ? 0 : Math.floor(domainMin * 0.85);

  return (
    <div className="space-y-8">
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
              content={<CustomChartTooltip />}
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

            <Area
              type="monotone"
              dataKey="value"
              stroke="#4d66ff"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#colorValue)"
              name="Actual Value"
              connectNulls={false}
              dot={<SmallAnomalyMarker />}
            />

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
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
