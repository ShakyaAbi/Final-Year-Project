import React from "react";
import { AlertTriangle } from "lucide-react";
import { formatDate } from "./ChartUtils";

export const CustomChartTooltip = ({ active, payload }: any) => {
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
