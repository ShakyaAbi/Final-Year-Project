import React from "react";
import { Indicator, IndicatorType } from "../types";
import { Button } from "./ui/Button";
import { Link } from "react-router-dom";

interface IndicatorCardProps {
  indicator: Indicator;
  onEdit?: (indicator: Indicator) => void;
}

export const IndicatorCard: React.FC<IndicatorCardProps> = ({
  indicator,
  onEdit,
}) => {
  const parseCategoryIds = (value?: string) =>
    String(value || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

  // Get latest submission
  const sortedValues = [...indicator.values].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );
  const latestSubmission =
    sortedValues.length > 0 ? sortedValues[sortedValues.length - 1] : undefined;
  const latestValue = latestSubmission?.value ?? indicator.baseline;
  const latestCategoryIds = parseCategoryIds(latestSubmission?.categoryValue);
  const targetCategoryIds = parseCategoryIds(indicator.targetCategory);

  // Calculate progress
  const currentValNum = Number(latestValue);
  const targetNum = Number(indicator.target);
  const hasNumericProgress =
    indicator.type !== IndicatorType.CATEGORICAL &&
    Number.isFinite(targetNum) &&
    targetNum > 0 &&
    !isNaN(currentValNum) &&
    !isNaN(targetNum);
  const numericProgress = hasNumericProgress
    ? Math.min(Math.max((currentValNum / targetNum) * 100, 0), 100)
    : 0;
  const hasCategoricalTarget =
    indicator.type === IndicatorType.CATEGORICAL && targetCategoryIds.length > 0;
  const categoricalMatchedCount = targetCategoryIds.filter((id) =>
    latestCategoryIds.includes(id),
  ).length;
  const categoricalProgress = hasCategoricalTarget
    ? Math.min(
        Math.max((categoricalMatchedCount / targetCategoryIds.length) * 100, 0),
        100,
      )
    : 0;
  const progress = hasNumericProgress ? numericProgress : categoricalProgress;
  const hasProgress =
    hasNumericProgress ||
    (indicator.type === IndicatorType.CATEGORICAL && hasCategoricalTarget);

  // Status color
  const getStatusColor = (status?: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800";
      case "Under Review":
        return "bg-amber-100 text-amber-800";
      case "Inactive":
        return "bg-slate-100 text-slate-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const formatValue = (val: number | string) => {
    if (indicator.type === IndicatorType.PERCENTAGE) return `${val}%`;
    if (indicator.type === IndicatorType.CURRENCY) return `$${val}`;
    return val;
  };

  const formatCategoryValue = (value?: string) => {
    if (!value || !indicator.categories) return "";
    const labels = value
      .split(",")
      .map((id) => id.trim())
      .map(
        (id) => indicator.categories?.find((cat) => cat.id === id)?.label || id,
      )
      .filter(Boolean);
    return labels.join(", ");
  };

  const targetDisplay =
    indicator.type === IndicatorType.CATEGORICAL
      ? indicator.targetCategory
        ? formatCategoryValue(indicator.targetCategory)
        : indicator.target === undefined ||
            indicator.target === null ||
            indicator.target === ""
          ? "No target set"
          : formatValue(indicator.target)
      : formatValue(indicator.target);

  const currentDisplay =
    indicator.type === IndicatorType.CATEGORICAL
      ? latestSubmission?.categoryValue
        ? formatCategoryValue(latestSubmission.categoryValue)
        : "No submission yet"
      : formatValue(latestValue);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col h-full">
      <div className="flex justify-between items-start mb-4">
        <div className="bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-wider px-2 py-1 rounded">
          {indicator.type}
        </div>
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(indicator.status)}`}
        >
          {indicator.status || "Active"}
        </span>
      </div>

      <h3 className="text-lg font-bold text-slate-900 mb-2">
        {indicator.name}
      </h3>
      <p className="text-slate-500 text-sm mb-6 line-clamp-2 flex-grow">
        {indicator.description || "No description provided."}
      </p>

      <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Target
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {targetDisplay}
          </p>
        </div>
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Current
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {currentDisplay}
          </p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-xs mb-2">
          <span className="font-medium text-slate-500">Progress</span>
          <span className="font-bold text-slate-900">
            {hasProgress
              ? `${Math.round(progress)}%`
              : indicator.type === IndicatorType.CATEGORICAL
                ? "No target"
                : "N/A"}
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              hasProgress ? "bg-blue-600" : "bg-slate-300"
            }`}
            style={{ width: `${hasProgress ? progress : 0}%` }}
          />
        </div>
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-100 mt-auto">
        <Link to={`/indicators/${indicator.id}`} className="flex-1">
          <Button
            variant="secondary"
            size="sm"
            className="w-full bg-slate-100 hover:bg-slate-200 border-none text-slate-600"
          >
            View Details
          </Button>
        </Link>
        <Button
          variant="outline"
          size="sm"
          className="px-4 text-slate-500 hover:text-slate-700"
          onClick={() => onEdit?.(indicator)}
        >
          Edit
        </Button>
      </div>
    </div>
  );
};
