import React from "react";
import { Indicator, IndicatorType } from "../../types";
import { formatCategoryValue } from "../../services/indicatorUtils";

interface IndicatorMetadataSummaryProps {
  indicator: Indicator;
}

export const IndicatorMetadataSummary: React.FC<IndicatorMetadataSummaryProps> = ({
  indicator,
}) => {
  return (
    <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
      <h4 className="font-semibold text-slate-900 text-sm mb-3">
        Indicator Details
      </h4>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between">
          <dt className="text-slate-500">Target</dt>
          <dd className="font-medium text-slate-900">
            {indicator.type === IndicatorType.CATEGORICAL ? (
              indicator.targetCategory ? (
                formatCategoryValue(indicator.targetCategory)
              ) : indicator.target === undefined ||
                indicator.target === null ||
                indicator.target === "" ? (
                "No target set"
              ) : (
                indicator.target
              )
            ) : (
              indicator.target
            )}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Baseline</dt>
          <dd className="font-medium text-slate-900">
            {indicator.type === IndicatorType.CATEGORICAL &&
            indicator.baselineCategory
              ? formatCategoryValue(indicator.baselineCategory)
              : indicator.baseline}
          </dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-slate-500">Frequency</dt>
          <dd className="font-medium text-slate-900">
            {indicator.frequency}
          </dd>
        </div>
      </dl>
    </div>
  );
};
