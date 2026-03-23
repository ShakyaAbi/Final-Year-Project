import React, { useState, useEffect } from "react";
import { Indicator, IndicatorType, CategoryDefinition } from "../types";
import { api } from "../services/api";
import { CategoryDistributionChart } from "./charts/CategoryDistributionChart";
import { PerformanceTrendChart } from "./charts/PerformanceTrendChart";

interface IndicatorChartsProps {
  indicator: Indicator;
  refreshCounter?: number;
}

export const IndicatorCharts: React.FC<IndicatorChartsProps> = ({
  indicator,
  refreshCounter,
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

  // Build category map for quick lookups
  const categoryIndexMap = new Map<string, number>();
  (indicator.categories || []).forEach((cat, idx) => {
    const position = idx + 1;
    categoryIndexMap.set(cat.id, position);
    categoryIndexMap.set(String(cat.id).toLowerCase(), position);
    categoryIndexMap.set(String(cat.label).toLowerCase(), position);
  });

  const getCategoryLabel = (id: string) =>
    indicator.categories?.find((cat) => cat.id === id)?.label || id;

  const formatCategoryValue = (value?: string) => {
    const ids = String(value || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length === 0) return "N/A";
    return ids.map(getCategoryLabel).join(", ");
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
  }, [isCategorical, indicator.id, indicator.categories, refreshCounter]);

  const totalCount = categoryData.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="space-y-6">
      {isCategorical &&
        (loading ? (
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
            <p className="text-sm text-slate-500">
              Loading category distribution...
            </p>
          </div>
        ) : (
          <CategoryDistributionChart
            categoryData={categoryData}
            totalCount={totalCount}
          />
        ))}

      {isNumeric ? (
        <PerformanceTrendChart
          indicator={indicator}
          isCategorical={isCategorical}
          categoryIndexMap={categoryIndexMap}
          formatCategoryValue={formatCategoryValue}
        />
      ) : isCategorical ? (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">
            Performance trend and prediction are hidden for categorical indicators.
          </p>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-sm text-slate-500">
            Trend charts are available for numeric indicators only.
          </p>
        </div>
      )}
    </div>
  );
};
