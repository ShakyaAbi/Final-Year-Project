import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { AlertCircle, TrendingUp } from "lucide-react";
import { Card } from "./ui/Card";
import { CategoryDefinition } from "../types";

interface CategoryDistribution {
  categoryId: string;
  label: string;
  count: number;
  percentage: number;
}

interface TimeSeriesPoint {
  period: string;
  startDate: string;
  endDate: string;
  categoryDistribution: CategoryDistribution[];
  totalSubmissions: number;
}

interface CategoryTimeSeriesChartProps {
  indicatorId: string;
  categories: CategoryDefinition[];
  refreshCounter?: number;
}

export const CategoryTimeSeriesChart: React.FC<
  CategoryTimeSeriesChartProps
> = ({ indicatorId, categories, refreshCounter }) => {
  const [selectedGroupBy, setSelectedGroupBy] = useState<"month" | "week">("month");
  const [selectedRange, setSelectedRange] = useState<string>("6");
  
  const [data, setData] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Calculate start/end date from selectedRange
    const now = new Date();
    let filterStart = new Date();
    const filterEnd = new Date();

    if (selectedRange === "all") {
      filterStart = new Date(2000, 0, 1); // Way back
    } else {
      filterStart = new Date(now.getFullYear(), now.getMonth() - Number(selectedRange), 1);
    }

    const fetchTimeSeries = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          startDate: filterStart.toISOString().split("T")[0],
          endDate: filterEnd.toISOString().split("T")[0],
          groupBy: selectedGroupBy,
        });
        const result = await api.get(
          `/indicators/${indicatorId}/category-time-series?${params}`,
        );

        // If 'all' was selected, filter out empty leading periods to keep it clean
        let finalData = result;
        if (selectedRange === "all" && Array.isArray(result)) {
           const firstDataIdx = result.findIndex(d => d.totalSubmissions > 0);
           if (firstDataIdx !== -1) {
             finalData = result.slice(firstDataIdx);
           }
        }

        setData(finalData);
      } catch (err: any) {
        setError(err.message || "Failed to load time-series data");
      } finally {
        setLoading(false);
      }
    };
    fetchTimeSeries();
  }, [indicatorId, selectedGroupBy, selectedRange, refreshCounter]);

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
  const maxSubmissions = Math.max(...data.map((d) => d.totalSubmissions), 0);

  // Get category colors
  const categoryColors: { [key: string]: string } = {};
  categories.forEach((cat) => {
    categoryColors[cat.id] = cat.color || "#4d66ff";
  });

  // Find the latest period with data
  const latestWithDataIdx = data.map((d) => d.totalSubmissions > 0).lastIndexOf(true);
  return (
    <Card>
      <div className="p-4 border-b border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Category Distribution Over Time
            </h3>
            <p className="text-sm text-slate-600">
              Showing {data.length} {selectedGroupBy === "month" ? "months" : `${selectedGroupBy}s`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Range Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg mr-2">
              {[
                { label: "3M", value: "3" },
                { label: "6M", value: "6" },
                { label: "1Y", value: "12" },
                { label: "All", value: "all" },
              ].map((r) => (
                <button
                  key={r.value}
                  onClick={() => setSelectedRange(r.value)}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all ${
                    selectedRange === r.value
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>

            {/* Group By Filter */}
            <select
              value={selectedGroupBy}
              onChange={(e) =>
                setSelectedGroupBy(e.target.value as "month" | "week")
              }
              className="px-3 py-1.5 border border-slate-200 rounded-lg text-[11px] font-medium bg-white text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
            >
              <option value="month">Month-wise</option>
              <option value="week">Week-wise</option>
            </select>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Stacked Bar Chart */}
        <div className="space-y-4">
          {data.map((point, idx) => {
            const totalCount = point.totalSubmissions;
            const isCurrent = idx === latestWithDataIdx;
            const isEmpty = totalCount === 0;
            return (
              <div key={point.period} className={`space-y-2 transition-all ${isCurrent ? 'ring-2 ring-blue-400 bg-blue-50/40' : ''} ${isEmpty ? 'opacity-60' : ''} rounded-lg p-2`}> 
                <div className="flex items-center justify-between text-sm">
                  <span className={`font-medium ${isCurrent ? 'text-blue-700' : 'text-slate-700'}`}>{point.period}</span>
                  <span className="text-slate-500">{totalCount} submission{totalCount !== 1 ? "s" : ""}</span>
                </div>
                <div className="relative h-10 bg-slate-100 rounded-lg overflow-hidden">
                  {totalCount > 0 ? (
                    <div className="flex h-full">
                      {categories.map((cat) => {
                        const dist = point.categoryDistribution.find((item) => item.categoryId === cat.id);
                        const percentage = dist?.percentage || 0;
                        const count = dist?.count || 0;
                        if (count === 0) return null;
                        return (
                          <div
                            key={cat.id}
                            className="relative group transition-opacity hover:opacity-90"
                            style={{ width: `${percentage}%`, backgroundColor: cat.color || "#4d66ff" }}
                          >
                            <div className="absolute inset-0 flex items-center justify-center">
                              {percentage > 10 && (
                                <span className="text-xs font-semibold text-white drop-shadow">
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
                      <span className="flex items-center gap-1"><AlertCircle className="w-4 h-4" /> No data</span>
                    </div>
                  )}
                </div>
                {/* Chips for each category with count */}
                <div className="flex gap-2 flex-wrap text-xs pl-1 mt-1">
                  {categories.map((cat) => {
                    const dist = point.categoryDistribution.find((item) => item.categoryId === cat.id);
                    if (!dist || dist.count === 0) return null;
                    return (
                      <span key={cat.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium" style={{ background: cat.color + '22', color: cat.color }}>
                        {cat.label}: {dist.count} ({Math.round(dist.percentage)}%)
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-600 mb-1">Total Periods</div>
            <div className="text-xl font-bold text-slate-900">{data.length}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-600 mb-1">Total Submissions</div>
            <div className="text-xl font-bold text-slate-900">{data.reduce((sum, d) => sum + d.totalSubmissions, 0)}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-600 mb-1">Avg per Period</div>
            <div className="text-xl font-bold text-slate-900">{Math.round(data.reduce((sum, d) => sum + d.totalSubmissions, 0) / data.length)}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3 text-center">
            <div className="text-xs text-slate-600 mb-1">Peak Period</div>
            <div className="text-xl font-bold text-slate-900">{maxSubmissions}</div>
          </div>
        </div>
      </div>
    </Card>
  );
};
