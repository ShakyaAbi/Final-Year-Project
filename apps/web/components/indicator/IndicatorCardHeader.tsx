import React from "react";
import { Link } from "react-router-dom";
import { Calendar } from "lucide-react";
import { Indicator, IndicatorType } from "../../types";

interface IndicatorCardHeaderProps {
  indicator: Indicator;
  projectName: string;
  lastValue: string;
  formatCategoryValue: (value: any, indicator: Indicator) => string;
}

export const IndicatorCardHeader: React.FC<IndicatorCardHeaderProps> = ({
  indicator,
  projectName,
  lastValue,
  formatCategoryValue,
}) => {
  return (
    <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Link
            to={`/projects/${indicator.projectId}`}
            className="text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-blue-600 hover:underline"
          >
            {projectName}
          </Link>
          <span className="text-slate-300">•</span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">
            {indicator.type}
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 uppercase flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {indicator.frequency || "Daily"}
          </span>
        </div>
        <Link
          to={`/indicators/${indicator.id}`}
          className="block group-hover:text-blue-600 transition-colors"
        >
          <h3 className="font-bold text-slate-900 text-lg">
            {indicator.name}
          </h3>
        </Link>
      </div>
      <div className="flex items-center gap-4 text-sm text-slate-600 bg-white px-3 py-1.5 rounded border border-slate-200 shadow-sm">
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-slate-400 font-bold uppercase">
            Target
          </span>
          <span className="font-bold">
            {indicator.type === IndicatorType.CATEGORICAL &&
            indicator.targetCategory
              ? formatCategoryValue(
                  indicator.targetCategory,
                  indicator,
                )
              : indicator.target}
          </span>
        </div>
        <div className="w-px h-6 bg-slate-200"></div>
        <div className="flex flex-col items-start">
          <span className="text-[10px] text-slate-400 font-bold uppercase">
            Last Value
          </span>
          <span className="font-bold text-slate-900">
            {lastValue}
          </span>
        </div>
      </div>
    </div>
  );
};
