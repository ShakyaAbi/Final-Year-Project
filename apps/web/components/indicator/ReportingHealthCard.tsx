import React from "react";
import { CalendarClock, AlertTriangle } from "lucide-react";
import { Indicator, IndicatorValue } from "../../types";
import { formatDate } from "../../services/indicatorUtils";

interface ReportingHealthCardProps {
  indicator: Indicator;
  project: any;
  reportingGaps: any[];
  anomalies: IndicatorValue[];
}

const frequencyToDays: Record<Indicator["frequency"], number> = {
  Daily: 1,
  Weekly: 7,
  Monthly: 30,
  Quarterly: 90,
  Yearly: 365,
};

export const ReportingHealthCard: React.FC<ReportingHealthCardProps> = ({
  indicator,
  project,
  reportingGaps,
  anomalies,
}) => {
  const frequency = indicator.frequency;
  const divisor = frequencyToDays[frequency] ?? 7;

  const submissionsTotal = indicator.values.length;
  let expectedSoFar = 1;

  if (project?.startDate) {
    const start = new Date(project.startDate);
    const end = new Date();
    const diffMs = Math.max(0, end.getTime() - start.getTime());
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    expectedSoFar = Math.ceil(diffDays / divisor);
  }

  const complianceRate = Math.min(
    100,
    Math.round((submissionsTotal / Math.max(1, expectedSoFar)) * 100),
  );
  const healthStatus =
    complianceRate >= 80
      ? "Healthy"
      : complianceRate >= 50
        ? "Needs Attention"
        : "Critical";
  const healthColor =
    complianceRate >= 80
      ? "text-green-600"
      : complianceRate >= 50
        ? "text-amber-600"
        : "text-red-600";
  const healthBg =
    complianceRate >= 80
      ? "bg-green-50"
      : complianceRate >= 50
        ? "bg-amber-50"
        : "bg-red-50";

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 overflow-hidden relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-blue-600" />
          Reporting Health
        </h3>
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
          {frequency}
        </span>
      </div>

      <div className="space-y-4">
        <div
          className={`p-4 rounded-xl flex items-center justify-between ${healthBg}`}
        >
          <div>
            <div
              className={`text-xs font-bold uppercase tracking-wider mb-1 ${healthColor}`}
            >
              Compliance Status
            </div>
            <div className="text-xl font-black text-slate-900 flex items-baseline gap-2">
              {complianceRate}%
              <span className="text-xs font-medium text-slate-500">
                ({submissionsTotal} / {expectedSoFar} entries)
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-sm font-bold ${healthColor}`}>
              {healthStatus}
            </div>
            <div className="text-[10px] text-slate-400 font-medium">
              Based on project timeline
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">
              Missed Gaps
            </div>
            <div className="text-lg font-bold text-slate-700">
              {reportingGaps.length}
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">
              Flagged Anomalies
            </div>
            <div className="text-lg font-bold text-slate-700">
              {anomalies.length}
            </div>
          </div>
        </div>

        {reportingGaps.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-2">
              <AlertTriangle className="w-3 h-3 text-amber-500" /> Major Reporting Gaps
            </div>
            {reportingGaps.slice(0, 2).map((gap, idx) => (
              <div
                key={`${gap.from}-${idx}`}
                className="text-[11px] text-slate-600 bg-white border border-slate-100 rounded px-3 py-2 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <CalendarClock className="w-3 h-3 text-slate-400" />
                  <span>
                    {formatDate(gap.from)} — {formatDate(gap.to)}
                  </span>
                </div>
                <span className="font-bold text-amber-600">
                  {gap.expectedSubmissions} periods missed
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
