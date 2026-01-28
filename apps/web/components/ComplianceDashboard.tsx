import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { AlertCircle, CheckCircle2, TrendingUp, Users } from "lucide-react";
import { Card } from "./ui/Card";

interface ComplianceData {
  expectedReports: number;
  receivedReports: number;
  complianceRate: number;
  onTimeReports: number;
  lateReports: number;
  missingReports: number;
  byDisaggregation: {
    [key: string]: {
      expected: number;
      received: number;
      compliance: number;
      missing: number;
    };
  };
}

interface ComplianceDashboardProps {
  indicatorId: string;
  startDate: Date;
  endDate: Date;
  reportingFrequency?: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
}

export const ComplianceDashboard: React.FC<ComplianceDashboardProps> = ({
  indicatorId,
  startDate,
  endDate,
  reportingFrequency = "MONTHLY",
}) => {
  const [data, setData] = useState<ComplianceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompliance = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          startDate: startDate.toISOString().split("T")[0],
          endDate: endDate.toISOString().split("T")[0],
          reportingFrequency,
        });
        const result = await api.get(
          `/indicators/${indicatorId}/reporting-compliance?${params}`,
        );
        setData(result);
      } catch (err: any) {
        setError(err.message || "Failed to load compliance data");
      } finally {
        setLoading(false);
      }
    };

    fetchCompliance();
  }, [indicatorId, startDate, endDate, reportingFrequency]);

  if (loading) {
    return (
      <Card>
        <div className="p-8 text-center text-slate-500">
          Loading compliance data...
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

  if (!data) return null;

  const compliancePercentage = Math.round(data.complianceRate * 100);
  const complianceColor =
    compliancePercentage >= 80
      ? "text-green-600 bg-green-50"
      : compliancePercentage >= 50
        ? "text-amber-600 bg-amber-50"
        : "text-red-600 bg-red-50";

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">
              Overall Compliance
            </span>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div
            className={`text-3xl font-bold ${complianceColor} inline-block px-3 py-1 rounded-lg`}
          >
            {compliancePercentage}%
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {data.receivedReports} of {data.expectedReports} reports
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">
              Received Reports
            </span>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {data.receivedReports}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            {data.onTimeReports} on time, {data.lateReports} late
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">
              Missing Reports
            </span>
            <AlertCircle className="w-4 h-4 text-red-500" />
          </div>
          <div className="text-3xl font-bold text-red-600">
            {data.missingReports}
          </div>
          <p className="text-xs text-slate-500 mt-2">Need follow-up</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-600">
              Reporting Entities
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-3xl font-bold text-slate-900">
            {Object.keys(data.byDisaggregation).length}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Districts/entities tracked
          </p>
        </Card>
      </div>

      {/* Disaggregation Breakdown */}
      {Object.keys(data.byDisaggregation).length > 0 && (
        <Card>
          <div className="p-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">
              Compliance by Entity
            </h3>
            <p className="text-sm text-slate-600">
              Breakdown of reporting compliance for each entity
            </p>
          </div>

          <div className="p-4">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">
                      Entity
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-700">
                      Expected
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-700">
                      Received
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-slate-700">
                      Missing
                    </th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">
                      Compliance
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {Object.entries(data.byDisaggregation)
                    .sort((a, b) => b[1].compliance - a[1].compliance)
                    .map(([entity, stats]) => {
                      const entityCompliance = Math.round(
                        stats.compliance * 100,
                      );
                      const entityColor =
                        entityCompliance >= 80
                          ? "bg-green-100 text-green-700"
                          : entityCompliance >= 50
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700";

                      return (
                        <tr key={entity} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-medium text-slate-900">
                            {entity}
                          </td>
                          <td className="text-center py-3 px-4 text-slate-600">
                            {stats.expected}
                          </td>
                          <td className="text-center py-3 px-4 text-slate-600">
                            {stats.received}
                          </td>
                          <td className="text-center py-3 px-4">
                            {stats.missing > 0 ? (
                              <span className="text-red-600 font-medium">
                                {stats.missing}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="text-right py-3 px-4">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${entityColor}`}
                            >
                              {entityCompliance}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
