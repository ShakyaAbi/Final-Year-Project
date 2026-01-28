import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { AlertCircle, TrendingUp } from "lucide-react";
import { Card } from "./ui/Card";
import { CategoryDefinition } from "../types";

interface CategoryDistribution {
  [categoryId: string]: {
    count: number;
    percentage: number;
  };
}

interface TimeSeriesPoint {
  period: string;
  startDate: string;
  endDate: string;
  categoryDistribution: CategoryDistribution;
  totalSubmissions: number;
}

interface CategoryTimeSeriesChartProps {
  indicatorId: string;
  startDate: Date;
  endDate: Date;
  groupBy?: "day" | "week" | "month" | "quarter" | "year";
  categories: CategoryDefinition[];
}

export const CategoryTimeSeriesChart: React.FC<
  CategoryTimeSeriesChartProps
> = ({ indicatorId, startDate, endDate, groupBy = "month", categories }) => {
  const [data, setData] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTimeSeries = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
          groupBy,
        });
        const result = await api.get(
          `/indicators/${indicatorId}/category-time-series?${params}`,
        );
        setData(result);
      } catch (err: any) {
        setError(err.message || "Failed to load time-series data");
      } finally {
        setLoading(false);
      }
    };

    fetchTimeSeries();
  }, [indicatorId, startDate, endDate, groupBy]);

  if (loading) {
    return (
      <Card>
        <div className="p-8 text-center text-slate-500">
          Loading time-series data...
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <div className="p-8 flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </Card>
    );
  }

  if (!data || data.length === 0) {
    return (
      <Card>
        <div className="p-8 text-center text-slate-500">
          No time-series data available for the selected period
        </div>
      </Card>
    );
  }

  // Calculate max value for scaling
  const maxSubmissions = Math.max(...data.map((d) => d.totalSubmissions));

  // Get category colors
  const categoryColors: { [key: string]: string } = {};
  categories.forEach((cat) => {
    categoryColors[cat.id] = cat.color || "#4d66ff";
  });

  return (
    <Card>
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Category Distribution Over Time
            </h3>
            <p className="text-sm text-slate-600">
              Showing {data.length}{" "}
              {groupBy === "month" ? "months" : `${groupBy}s`}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: cat.color || "#4d66ff" }}
                />
                <span className="text-xs text-slate-600">{cat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stacked Bar Chart */}
        <div className="space-y-4">
          {data.map((point) => {
            const totalCount = point.totalSubmissions;

            return (
              <div key={point.period} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-700">
                    {point.period}
                  </span>
                  <span className="text-slate-500">
                    {totalCount} submission{totalCount !== 1 ? "s" : ""}
                  </span>
                </div>

                <div className="relative h-12 bg-slate-100 rounded-lg overflow-hidden">
                  {totalCount > 0 ? (
                    <div className="flex h-full">
                      {categories.map((cat) => {
                        const dist = point.categoryDistribution[cat.id];
                        const percentage = dist?.percentage || 0;
                        const count = dist?.count || 0;

                        if (count === 0) return null;

                        return (
                          <div
                            key={cat.id}
                            className="relative group transition-opacity hover:opacity-80"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: cat.color || "#4d66ff",
                            }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center">
                              {percentage > 10 && (
                                <span className="text-xs font-semibold text-white">
                                  {count}
                                </span>
                              )}
                            </div>
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                              {cat.label}: {count} ({Math.round(percentage)}%)
                              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-xs text-slate-400">
                      No data
                    </div>
                  )}
                </div>

                {/* Percentage breakdown */}
                <div className="flex gap-4 text-xs text-slate-600 pl-1">
                  {categories.map((cat) => {
                    const dist = point.categoryDistribution[cat.id];
                    if (!dist || dist.count === 0) return null;

                    return (
                      <span key={cat.id}>
                        {cat.label}: {Math.round(dist.percentage)}%
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <div className="text-xs text-slate-600 mb-1">Total Periods</div>
            <div className="text-xl font-bold text-slate-900">
              {data.length}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-1">Total Submissions</div>
            <div className="text-xl font-bold text-slate-900">
              {data.reduce((sum, d) => sum + d.totalSubmissions, 0)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-1">Avg per Period</div>
            <div className="text-xl font-bold text-slate-900">
              {Math.round(
                data.reduce((sum, d) => sum + d.totalSubmissions, 0) /
                  data.length,
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-600 mb-1">Peak Period</div>
            <div className="text-xl font-bold text-slate-900">
              {maxSubmissions}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
