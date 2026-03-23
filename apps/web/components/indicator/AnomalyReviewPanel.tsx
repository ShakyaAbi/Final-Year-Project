import React from "react";
import { AlertTriangle } from "lucide-react";
import { Indicator, IndicatorValue } from "../../types";
import { formatDate, formatCategoricalDisplay, inferAnomalyReason } from "../../services/indicatorUtils";

interface AnomalyReviewPanelProps {
  indicator: Indicator;
  anomalies: IndicatorValue[];
}

export const AnomalyReviewPanel: React.FC<AnomalyReviewPanelProps> = ({
  indicator,
  anomalies,
}) => {
  if (anomalies.length === 0) return null;

  return (
    <div className="bg-red-50 border border-red-100 rounded-lg p-6">
      <div className="flex items-center mb-4 text-red-800">
        <AlertTriangle className="w-5 h-5 mr-2" />
        <h3 className="font-semibold">
          Detected Anomalies ({anomalies.length})
        </h3>
      </div>
      <div className="space-y-3">
        {anomalies
          .slice(-3)
          .reverse()
          .map((a) => (
            <div
              key={a.id}
              className="bg-white p-3 rounded border border-red-100 text-sm shadow-sm"
            >
              <div className="flex justify-between items-start gap-4">
                <div>
                  <span className="font-medium text-slate-900 mr-2">
                    {formatDate(a.date)}
                  </span>
                  <span className="text-slate-500">
                    Value:{" "}
                    {formatCategoricalDisplay(
                      a.value,
                      a.categoryValue,
                      indicator.type,
                      indicator.categories,
                    )}
                  </span>
                </div>
                <span className="text-red-600 font-medium text-xs bg-red-50 px-2 py-1 rounded-full border border-red-100">
                  Anomaly
                </span>
              </div>
              <div className="text-xs text-red-700 mt-2">
                {inferAnomalyReason(
                  a.value,
                  indicator,
                  a.anomalyReason,
                  a.isAnomaly,
                  a.anomalyScore,
                  a.anomalyThreshold,
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};
