import React, { useState, useEffect } from "react";
import { Indicator, MLEvaluationResult } from "../../types";
import { api } from "../../services/api";
import { Button } from "../ui/Button";
import { 
  BarChart, 
  Search, 
  TrendingUp, 
  ShieldCheck, 
  Zap,
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface MLEvaluationPanelProps {
  indicator: Indicator;
  onRescore?: () => Promise<void> | void;
}

export const MLEvaluationPanel: React.FC<MLEvaluationPanelProps> = ({
  indicator,
  onRescore,
}) => {
  const [loading, setLoading] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [results, setResults] = useState<MLEvaluationResult[]>([]);
  const [compareAll, setCompareAll] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const runEvaluation = async () => {
    setLoading(true);
    setError(null);
    setStatusMessage(null);
    try {
      const data = await api.evaluateML(indicator.id, compareAll);
      setResults(data.results || []);
      setIsExpanded(true);
    } catch (err: any) {
      setError(err?.message || "Failed to evaluate models.");
    } finally {
      setLoading(false);
    }
  };

  const recalculateAnomalies = async () => {
    setRecalculating(true);
    setError(null);
    setStatusMessage(null);
    try {
      await api.recalculateIndicatorAnomalies(indicator.id);
      setStatusMessage("Historical anomaly flags were recalculated.");
      if (onRescore) {
        await onRescore();
      }
    } catch (err: any) {
      setError(err?.message || "Failed to recalculate anomaly flags.");
    } finally {
      setRecalculating(false);
    }
  };

  if (indicator.type === "Categorical" || indicator.type === "Boolean" || indicator.type === "Text") {
    return null;
  }

  const isMLEnabled = indicator.anomalyConfig?.mode === "ML";
  const mlMinPoints = indicator.anomalyConfig?.ml?.minPoints ?? 20;
  const numericSubmissionCount = indicator.values.filter((value) => typeof value.value === "number").length;
  const isHistoryInsufficient = isMLEnabled && numericSubmissionCount < mlMinPoints;

  const bestModel = results.length > 0 
    ? [...results].sort((a, b) => b.f1 - a.f1)[0]
    : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 rounded-lg">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Model Performance Evaluation</h3>
            <p className="text-xs text-slate-500">Benchmark detection algorithms against historical flags</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {!results.length && !loading && (
            <span className="text-xs font-medium text-slate-400 italic">Not yet evaluated</span>
          )}
          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={compareAll}
                  onChange={(e) => setCompareAll(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600"
                />
                Compare all algorithms
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button 
                size="sm" 
                onClick={(e) => { e.stopPropagation(); runEvaluation(); }} 
                isLoading={loading}
                disabled={indicator.values.length < 5}
              >
                <Zap className="w-3.5 h-3.5 mr-2" />
                {results.length ? "Re-evaluate" : "Run Evaluation"}
              </Button>
              {isMLEnabled && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => { e.stopPropagation(); recalculateAnomalies(); }}
                  isLoading={recalculating}
                >
                  Recalculate anomalies
                </Button>
              )}
            </div>
          </div>
          {isMLEnabled && isHistoryInsufficient && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-2">
              <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-[11px] text-amber-800">
                ML mode is enabled, but this indicator has only {numericSubmissionCount} numeric submissions. ML scoring will remain limited until it reaches {mlMinPoints} values.
              </p>
            </div>
          )}

          {indicator.values.length < 5 && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-2">
              <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-[11px] text-amber-800">
                Evaluation requires at least 5 submissions to generate meaningful metrics.
              </p>
            </div>
          )}

          {isHistoryInsufficient && (
            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg flex gap-2">
              <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
              <p className="text-[11px] text-amber-800">
                Not enough ML anomaly history yet. This indicator needs at least {mlMinPoints} numeric submissions before ML anomaly detection can run reliably.
              </p>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
          {statusMessage && <p className="text-xs text-slate-600">{statusMessage}</p>}

          {results.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-5 gap-2 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                <div className="col-span-1">Algorithm</div>
                <div className="text-center">Precision</div>
                <div className="text-center">Recall</div>
                <div className="text-center">F1 Score</div>
                <div className="text-center">Accuracy</div>
              </div>
              
              {results.map((res) => (
                <div 
                  key={res.method} 
                  className={`grid grid-cols-5 gap-2 p-3 rounded-lg border items-center ${
                    isMLEnabled && indicator.anomalyConfig?.ml?.method === res.method
                      ? "bg-indigo-50 border-indigo-200 ring-1 ring-indigo-100"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <div className="col-span-1">
                    <div className="text-xs font-bold text-slate-900">{res.method.replace(/_/g, " ")}</div>
                    {isMLEnabled && indicator.anomalyConfig?.ml?.method === res.method && (
                      <div className="text-[9px] text-indigo-600 font-bold uppercase mt-0.5 flex items-center gap-1">
                        <ShieldCheck className="w-2.5 h-2.5" /> Currently Active
                      </div>
                    )}
                    {bestModel?.method === res.method && bestModel.f1 > 0 && (
                      <div className="text-[9px] text-emerald-600 font-bold uppercase mt-0.5 flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" /> Highly Recommended
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-slate-700">{(res.precision * 100).toFixed(0)}%</div>
                    <div className="w-full bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                      <div className="bg-emerald-500 h-full" style={{ width: `${res.precision * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-semibold text-slate-700">{(res.recall * 100).toFixed(0)}%</div>
                    <div className="w-full bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                      <div className="bg-blue-500 h-full" style={{ width: `${res.recall * 100}%` }} />
                    </div>
                  </div>
                  <div className="text-center font-bold text-indigo-600 text-sm">
                    {(res.f1).toFixed(2)}
                  </div>
                  <div className="text-center text-xs font-medium text-slate-500">
                    {(res.accuracy * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
