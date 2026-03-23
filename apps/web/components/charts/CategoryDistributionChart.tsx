import React from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { CategoryDefinition } from "../../types";

interface CategoryDistributionChartProps {
  categoryData: Array<{ name: string; value: number; color: string }>;
  totalCount: number;
}

export const CategoryDistributionChart: React.FC<CategoryDistributionChartProps> = ({
  categoryData,
  totalCount,
}) => {
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
