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
  startDate: Date;
  endDate: Date;
  groupBy?: "day" | "week" | "month" | "quarter" | "year";
  categories: CategoryDefinition[];
}

export const CategoryTimeSeriesChart: React.FC<
  CategoryTimeSeriesChartProps
> = ({ indicatorId, startDate, endDate, groupBy = "month", categories }) => {
  const [selectedGroupBy, setSelectedGroupBy] = useState<"month" | "week">(groupBy);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  // Calculate month range for picker (last 12 months)
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const [data, setData] = useState<TimeSeriesPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Set default selectedMonth to most recent with data, or current month
  useEffect(() => {
    if (!selectedMonth && data && data.length > 0) {
      // Find most recent period with data
      const mostRecent = data.slice().reverse().find(d => d.totalSubmissions > 0);
      if (mostRecent) {
        // Expect period in YYYY-MM or YYYY-MM-DD
        const m = mostRecent.period.slice(0, 7);
        setSelectedMonth(m);
        return;
      }
      // Fallback: current month
      const now = new Date();
      setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
    }
  }, [data, selectedMonth]);

  useEffect(() => {
    // Calculate start/end date from selectedMonth
    let filterStart = startDate;
    let filterEnd = endDate;
    if (selectedMonth) {
      const [year, month] = selectedMonth.split("-").map(Number);
      filterStart = new Date(year, month - 1, 1);
      filterEnd = new Date(year, month, 0, 23, 59, 59, 999); // End of month
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
        setData(result);
      } catch (err: any) {
        setError(err.message || "Failed to load time-series data");
      } finally {
        setLoading(false);
      }
    };
    fetchTimeSeries();
  }, [indicatorId, startDate, endDate, selectedGroupBy, selectedMonth]);

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
            {/* Group By Filter */}
            <select
              value={selectedGroupBy}
              onChange={e => setSelectedGroupBy(e.target.value as "month" | "week")}
              className="px-2 py-1 border border-slate-300 rounded-md text-xs bg-white text-slate-700"
            >
              <option value="month">Month-wise</option>
              <option value="week">Week-wise</option>
            </select>
            {/* Month Picker */}
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="px-2 py-1 border border-slate-300 rounded-md text-xs bg-white text-slate-700"
            >
              {months.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            {/* Category Chips */}
            {categories.map((cat) => (
              <span key={cat.id} className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium" style={{ background: cat.color + '22', color: cat.color }}>
                <span className="w-2 h-2 rounded-full mr-1" style={{ background: cat.color }} />
                {cat.label}
              </span>
            ))}
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
