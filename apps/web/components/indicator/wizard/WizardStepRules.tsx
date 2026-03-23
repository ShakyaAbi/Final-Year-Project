import React from "react";
import { Indicator, IndicatorType, AnomalyConfig } from "../../../types";
import { AlertCircle, HelpCircle } from "lucide-react";
import { Tooltip } from "../../ui/Tooltip";

interface WizardStepRulesProps {
  formData: Partial<Indicator>;
  updateField: (field: keyof Indicator, value: any) => void;
  updateAnomalyConfig: (patch: Partial<AnomalyConfig>) => void;
}

export const WizardStepRules: React.FC<WizardStepRulesProps> = ({
  formData,
  updateField,
  updateAnomalyConfig,
}) => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        Target & Rules
      </h2>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3 mb-6">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <p className="text-sm text-amber-800">
          Values entered outside of the defined range will be flagged or
          rejected during data entry.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Target Value{" "}
          {formData.type !== IndicatorType.CATEGORICAL && (
            <span className="text-red-500">*</span>
          )}
        </label>

        {formData.type === IndicatorType.BOOLEAN ? (
          <select
            value={formData.target as string}
            onChange={(e) => updateField("target", e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
          >
            <option value="">Select target state...</option>
            <option value="true">{formData.booleanLabels?.true}</option>
            <option value="false">{formData.booleanLabels?.false}</option>
          </select>
        ) : formData.type === IndicatorType.TEXT ? (
          <input
            type="text"
            value={formData.target as string}
            onChange={(e) => updateField("target", e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
          />
        ) : (
          <input
            type="number"
            value={formData.target ?? ""}
            onChange={(e) => {
              const raw = e.target.value;
              updateField(
                "target",
                raw === "" ? undefined : parseFloat(raw),
              );
            }}
            className="w-full px-3 py-2 border border-slate-300 rounded-md text-lg font-semibold bg-white text-slate-900"
          />
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Baseline Value
        </label>
        {formData.type === IndicatorType.BOOLEAN ? (
          <select
            value={formData.baseline as string}
            onChange={(e) => updateField("baseline", e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
          >
            <option value="">Select baseline state...</option>
            <option value="true">{formData.booleanLabels?.true}</option>
            <option value="false">{formData.booleanLabels?.false}</option>
          </select>
        ) : formData.type === IndicatorType.TEXT ? (
          <input
            type="text"
            value={formData.baseline as string}
            onChange={(e) => updateField("baseline", e.target.value)}
            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
          />
        ) : (
          <input
            type="number"
            value={formData.baseline as number}
            onChange={(e) =>
              updateField("baseline", parseFloat(e.target.value))
            }
            className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
          />
        )}
      </div>

      {(formData.type === IndicatorType.NUMBER ||
        formData.type === IndicatorType.PERCENTAGE ||
        formData.type === IndicatorType.CURRENCY ||
        formData.type === IndicatorType.CATEGORICAL) && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Min Expected
            </label>
            <input
              type="number"
              value={formData.minExpected}
              onChange={(e) =>
                updateField("minExpected", parseFloat(e.target.value))
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Max Expected
            </label>
            <input
              type="number"
              value={formData.maxExpected}
              onChange={(e) =>
                updateField("maxExpected", parseFloat(e.target.value))
              }
              className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
            />
          </div>
        </div>
      )}

      {(formData.type === IndicatorType.NUMBER ||
        formData.type === IndicatorType.PERCENTAGE ||
        formData.type === IndicatorType.CURRENCY) && (
        <div className="border border-slate-200 rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-slate-900">
                Anomaly Settings
              </h4>
              <p className="text-xs text-slate-500">
                Simple checks for range and sudden changes.
              </p>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={formData.anomalyConfig?.enabled ?? true}
                onChange={(e) =>
                  updateAnomalyConfig({ enabled: e.target.checked })
                }
                className="rounded border-slate-300 text-blue-600"
              />
              Enable
            </label>
          </div>

          {(formData.anomalyConfig?.enabled ?? true) && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Detection Mode
                  </label>
                  <select
                    value={formData.anomalyConfig?.mode ?? "RULES"}
                    onChange={(e) =>
                      updateAnomalyConfig({
                        mode: e.target.value as "RULES" | "ML",
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm"
                  >
                    <option value="RULES">Rules (Range + % Change)</option>
                    <option value="ML">ML (Advanced)</option>
                  </select>
                </div>
                <div className="flex items-end text-xs text-slate-500">
                  Choose rule-based checks or ML scoring per indicator.
                </div>
              </div>

              {(formData.anomalyConfig?.mode ?? "RULES") === "ML" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
                        ML Algorithm
                        <Tooltip content="Isolation Forest is recommended for most use cases.">
                          <HelpCircle className="w-3 h-3 text-slate-400" />
                        </Tooltip>
                      </label>
                      <select
                        value={formData.anomalyConfig?.ml?.method ?? "ISOLATION_FOREST"}
                        onChange={(e) =>
                          updateAnomalyConfig({
                            ml: {
                              ...formData.anomalyConfig?.ml,
                              method: e.target.value as any,
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm"
                      >
                        <option value="ISOLATION_FOREST">Isolation Forest</option>
                        <option value="Z_SCORE">Z-Score (Modified)</option>
                        <option value="LOF">Local Outlier Factor</option>
                        <option value="DBSCAN">DBSCAN</option>
                      </select>
                      <p className="text-[10px] text-slate-500 mt-1 italic">
                        {formData.anomalyConfig?.ml?.method === "ISOLATION_FOREST" && "Best for global outliers in most datasets."}
                        {formData.anomalyConfig?.ml?.method === "Z_SCORE" && "Fast baseline. Sensitive to extreme values."}
                        {formData.anomalyConfig?.ml?.method === "LOF" && "Detects 'local' outliers based on neighbor density."}
                        {formData.anomalyConfig?.ml?.method === "DBSCAN" && "Clustered approach. Good for complex distributions."}
                      </p>
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-1">
                        {formData.anomalyConfig?.ml?.method === "Z_SCORE" ? "Z-Score Threshold" : "Contamination"}
                        <Tooltip content={formData.anomalyConfig?.ml?.method === "Z_SCORE" ? "Threshold for standard deviations. 3.5 is standard." : "Expected percentage of anomalies in the data (e.g. 0.05 = 5%)."}>
                          <HelpCircle className="w-3 h-3 text-slate-400" />
                        </Tooltip>
                      </label>
                      {formData.anomalyConfig?.ml?.method === "Z_SCORE" ? (
                        <input
                          type="number"
                          step="0.1"
                          min={1.0}
                          max={10.0}
                          value={formData.anomalyConfig?.ml?.zscore_threshold ?? 3.5}
                          onChange={(e) =>
                            updateAnomalyConfig({
                              ml: {
                                ...formData.anomalyConfig?.ml,
                                zscore_threshold: parseFloat(e.target.value),
                              },
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm"
                        />
                      ) : (
                        <input
                          type="number"
                          step="0.01"
                          min={0.01}
                          max={0.5}
                          value={formData.anomalyConfig?.ml?.contamination ?? 0.05}
                          onChange={(e) =>
                            updateAnomalyConfig({
                              ml: {
                                ...formData.anomalyConfig?.ml,
                                contamination: parseFloat(e.target.value),
                              },
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm"
                        />
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Window Size
                      </label>
                      <input
                        type="number"
                        min={5}
                        value={formData.anomalyConfig?.ml?.windowSize ?? 50}
                        onChange={(e) =>
                          updateAnomalyConfig({
                            ml: {
                              ...formData.anomalyConfig?.ml,
                              windowSize: parseInt(e.target.value, 10),
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Min Points
                      </label>
                      <input
                        type="number"
                        min={5}
                        value={formData.anomalyConfig?.ml?.minPoints ?? 20}
                        onChange={(e) =>
                          updateAnomalyConfig({
                            ml: {
                              ...formData.anomalyConfig?.ml,
                              minPoints: parseInt(e.target.value, 10),
                            },
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={formData.anomalyConfig?.rules?.range ?? true}
                      onChange={(e) =>
                        updateAnomalyConfig({
                          rules: { range: e.target.checked },
                        })
                      }
                      className="rounded border-slate-300 text-blue-600"
                    />
                    Flag values outside Min/Max Expected range
                  </label>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      Max % Change from Previous Value
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={
                        formData.anomalyConfig?.rules?.maxChangePercent ?? 50
                      }
                      onChange={(e) =>
                        updateAnomalyConfig({
                          rules: {
                            maxChangePercent: parseFloat(e.target.value),
                          },
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900 text-sm"
                    />
                    <p className="text-[11px] text-slate-500 mt-1">
                      Flags big jumps vs the last reported value.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
