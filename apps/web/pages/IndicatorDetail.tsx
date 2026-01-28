import React, { useEffect, useState } from "react";
import { Layout } from "../components/Layout";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { Indicator, IndicatorType, CategoryDefinition } from "../types";
import { api } from "../services/api";
import { Button } from "../components/ui/Button";
import { IndicatorCharts } from "../components/IndicatorCharts";
import { ImportWizard } from "../components/ImportWizard";
import { ExportDialog } from "../components/ExportDialog";
import { CategoryTimeSeriesChart } from "../components/CategoryTimeSeriesChart";
import {
  ArrowLeft,
  AlertTriangle,
  Save,
  History,
  FileText,
  UploadCloud,
  X,
  Link as LinkIcon,
  Table as TableIcon,
  ArrowUpDown,
  CheckCircle,
  Download,
} from "lucide-react";

export const IndicatorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [indicator, setIndicator] = useState<Indicator | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [entryValue, setEntryValue] = useState<string>("");
  const [entryDate, setEntryDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const [evidence, setEvidence] = useState<string>("");
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Table Sort State
  const [sortField, setSortField] = useState<"date" | "value">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Import/Export State
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  useEffect(() => {
    if (id) {
      Promise.all([api.getIndicator(id), api.getIndicatorSubmissions(id)])
        .then(([data, submissions]) => {
          setIndicator({ ...data, values: submissions });
          setLoading(false);
        })
        .catch((error) => {
          console.error("Failed to load indicator", error);
          setIndicator(undefined);
          setLoading(false);
        });
    }
  }, [id]);

  useEffect(() => {
    if (searchParams.get("csvSetup") === "1") {
      setShowImportWizard(true);
    }
  }, [searchParams]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setAttachedFile(e.dataTransfer.files[0]);
      setEvidence(""); // Clear text input to avoid ambiguity
    }
  };

  const handleCategoryToggle = (categoryId: string, allowMultiple: boolean) => {
    if (allowMultiple) {
      setSelectedCategories((prev) =>
        prev.includes(categoryId)
          ? prev.filter((id) => id !== categoryId)
          : [...prev, categoryId],
      );
    } else {
      setSelectedCategories([categoryId]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!indicator) return;

    // For CATEGORICAL, check selectedCategories; for others, check entryValue
    if (indicator.type === IndicatorType.CATEGORICAL) {
      if (selectedCategories.length === 0) return;
    } else if (entryValue === "") return;

    setSaving(true);
    setError(null);

    // For CATEGORICAL: value is the category ID(s), for others: value is numeric/text
    const valuePayload =
      indicator.type === IndicatorType.CATEGORICAL
        ? selectedCategories.join(",")
        : indicator.type === IndicatorType.NUMBER ||
            indicator.type === IndicatorType.PERCENTAGE ||
            indicator.type === IndicatorType.CURRENCY
          ? Number(entryValue)
          : entryValue;

    const finalEvidence = attachedFile
      ? `[Attached] ${attachedFile.name}`
      : evidence;

    let didError = false;
    try {
      await api.createSubmission(indicator.id, {
        reportedAt: entryDate,
        value: valuePayload,
        evidence: finalEvidence,
      });

      const submissions = await api.getIndicatorSubmissions(indicator.id);
      setIndicator((prev) =>
        prev
          ? {
              ...prev,
              values: submissions,
            }
          : undefined,
      );
    } catch (err: any) {
      didError = true;
      setError(err?.message || "Failed to submit value.");
    }

    if (!didError) {
      setEntryValue("");
      setSelectedCategories([]);
      setEvidence("");
      setAttachedFile(null);
    }
    setSaving(false);
  };

  const handleSort = (field: "date" | "value") => {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  if (loading)
    return (
      <Layout>
        <div className="p-8 text-center">Loading...</div>
      </Layout>
    );
  if (!indicator)
    return (
      <Layout>
        <div className="p-8 text-center text-red-500">Indicator not found</div>
      </Layout>
    );

  const anomalies = indicator.values.filter((v) => v.isAnomaly);

  const formatDate = (value: string) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      timeZone: "UTC",
    });
  };

  // Helper to format category values for display
  const formatCategoryValue = (value: string | number | undefined): string => {
    if (indicator.type !== IndicatorType.CATEGORICAL || !indicator.categories) {
      return String(value);
    }

    if (value === undefined || value === null || value === "") return "";

    const categoryIds = String(value).split(",");
    const labels = categoryIds
      .map((id) => {
        const cat = indicator.categories?.find((c) => c.id === id.trim());
        return cat?.label || id;
      })
      .filter(Boolean);

    return labels.length > 0 ? labels.join(", ") : String(value);
  };

  const formatCategoricalDisplay = (
    value: string | number | undefined,
  ): string => {
    if (!indicator || indicator.type !== IndicatorType.CATEGORICAL) {
      return String(value ?? "N/A");
    }
    // For categorical indicators, value contains the category ID(s)
    const label = formatCategoryValue(value);
    return label || String(value ?? "N/A");
  };

  const inferAnomalyReason = (
    value: number | string,
    existing?: string,
    isAnomaly?: boolean,
  ) => {
    if (!isAnomaly) return "";
    if (existing && existing.trim()) return existing;
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return "Anomaly detected";
    if (indicator.type === IndicatorType.PERCENTAGE) {
      const lower = indicator.minExpected ?? 0;
      const upper = indicator.maxExpected ?? 100;
      if (numericValue < lower)
        return `Percent must be between ${lower} and ${upper}`;
      if (numericValue > upper)
        return `Percent must be between ${lower} and ${upper}`;
    }
    if (
      indicator.type === IndicatorType.NUMBER ||
      indicator.type === IndicatorType.CURRENCY
    ) {
      if (
        indicator.minExpected !== undefined &&
        numericValue < indicator.minExpected
      ) {
        return `Value below expected minimum (${indicator.minExpected})`;
      }
      if (
        indicator.maxExpected !== undefined &&
        numericValue > indicator.maxExpected
      ) {
        return `Value exceeds expected maximum (${indicator.maxExpected})`;
      }
    }
    return "Anomaly detected";
  };

  // Sort values for table
  const tableValues = [...indicator.values].sort((a, b) => {
    if (sortField === "date") {
      return sortOrder === "asc"
        ? new Date(a.date).getTime() - new Date(b.date).getTime()
        : new Date(b.date).getTime() - new Date(a.date).getTime();
    } else {
      return sortOrder === "asc"
        ? Number(a.value) - Number(b.value)
        : Number(b.value) - Number(a.value);
    }
  });

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <Link
          to={`/projects/${indicator.projectId}`}
          className="inline-flex items-center text-sm text-slate-500 hover:text-blue-600 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Project
        </Link>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                {indicator.type}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
                v{indicator.currentVersion}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {indicator.name}
            </h1>
          </div>
          <Button variant="outline" size="sm">
            <History className="w-4 h-4 mr-2" />
            Definition History
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* Charts Section */}
          <IndicatorCharts indicator={indicator} />

          {/* Time-Series Chart for Categorical Indicators */}
          {indicator.type === IndicatorType.CATEGORICAL &&
            indicator.categories &&
            indicator.categories.length > 0 && (
              <CategoryTimeSeriesChart
                indicatorId={indicator.id}
                startDate={
                  new Date(
                    new Date().getFullYear(),
                    new Date().getMonth() - 5,
                    1,
                  )
                }
                endDate={new Date()}
                groupBy="month"
                categories={indicator.categories}
              />
            )}

          {/* Anomaly Summary Block */}
          {anomalies.length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-6">
              <div className="flex items-center mb-4 text-red-800">
                <AlertTriangle className="w-5 h-5 mr-2" />
                <h3 className="font-semibold">
                  Detected Anomalies ({anomalies.length})
                </h3>
              </div>
              <div className="space-y-3">
                {anomalies
                  .slice(-3)
                  .reverse()
                  .map((a) => (
                    <div
                      key={a.id}
                      className="bg-white p-3 rounded border border-red-100 text-sm shadow-sm"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className="font-medium text-slate-900 mr-2">
                            {formatDate(a.date)}
                          </span>
                          <span className="text-slate-500">
                            Category: {formatCategoricalDisplay(a.value)}
                          </span>
                        </div>
                        <span className="text-red-600 font-medium text-xs bg-red-50 px-2 py-1 rounded-full border border-red-100">
                          Anomaly
                        </span>
                      </div>
                      <div className="text-xs text-red-700 mt-2">
                        {inferAnomalyReason(
                          a.value,
                          a.anomalyReason,
                          a.isAnomaly,
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Data History Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TableIcon className="w-5 h-5 text-slate-400" />
                Data History
              </h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowImportWizard(true)}
                >
                  <UploadCloud className="w-4 h-4 mr-2" /> Import CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowExportDialog(true)}
                >
                  <Download className="w-4 h-4 mr-2" /> Export CSV
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th
                        className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort("date")}
                      >
                        <div className="flex items-center gap-1">
                          Reporting Date
                          <ArrowUpDown
                            className={`w-3 h-3 ${sortField === "date" ? "text-blue-600" : "text-slate-400"}`}
                          />
                        </div>
                      </th>
                      <th
                        className="px-6 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                        onClick={() => handleSort("value")}
                      >
                        <div className="flex items-center gap-1">
                          Value
                          <ArrowUpDown
                            className={`w-3 h-3 ${sortField === "value" ? "text-blue-600" : "text-slate-400"}`}
                          />
                        </div>
                      </th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Anomaly Reason</th>
                      <th className="px-6 py-3">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableValues.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-6 py-8 text-center text-slate-400 italic"
                        >
                          No data entries recorded yet.
                        </td>
                      </tr>
                    ) : (
                      tableValues.map((row) => (
                        <tr
                          key={row.id}
                          className={`hover:bg-slate-50 transition-colors ${row.isAnomaly ? "bg-red-50/30" : ""}`}
                        >
                          <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                            {formatDate(row.date)}
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-700">
                            {formatCategoricalDisplay(row.value)}
                            <span className="text-xs text-slate-400 ml-1">
                              {indicator.unit}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {row.isAnomaly ? (
                              <div
                                className="flex items-center gap-2 text-red-600"
                                title={inferAnomalyReason(
                                  row.value,
                                  row.anomalyReason,
                                  row.isAnomaly,
                                )}
                              >
                                <AlertTriangle className="w-4 h-4" />
                                <span className="text-xs font-semibold">
                                  Anomaly
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-green-600">
                                <CheckCircle className="w-4 h-4" />
                                <span className="text-xs font-semibold">
                                  Verified
                                </span>
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {row.isAnomaly ? (
                              <span
                                className="text-xs text-red-600 block max-w-[260px] whitespace-normal break-words"
                                title={inferAnomalyReason(
                                  row.value,
                                  row.anomalyReason,
                                  row.isAnomaly,
                                )}
                              >
                                {inferAnomalyReason(
                                  row.value,
                                  row.anomalyReason,
                                  row.isAnomaly,
                                )}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {row.evidence ? (
                              row.evidence.startsWith("[Attached]") ? (
                                <div className="flex items-center gap-2 text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 w-fit">
                                  <FileText className="w-3 h-3" />
                                  <span className="text-xs truncate max-w-[150px]">
                                    {row.evidence.replace("[Attached] ", "")}
                                  </span>
                                </div>
                              ) : (
                                <span
                                  className="text-xs text-slate-600 italic block max-w-[200px] truncate"
                                  title={row.evidence}
                                >
                                  {row.evidence}
                                </span>
                              )
                            ) : (
                              <span className="text-xs text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar: Data Entry */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-lg shadow-slate-200/50 sticky top-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              Weekly Data Entry
            </h3>
            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reporting Date
                </label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full rounded-md border-slate-300 border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Value
                </label>
                <input
                  type={
                    indicator.type === IndicatorType.NUMBER ||
                    indicator.type === IndicatorType.PERCENTAGE ||
                    indicator.type === IndicatorType.CURRENCY
                      ? "number"
                      : "text"
                  }
                  step={
                    indicator.type === IndicatorType.NUMBER ||
                    indicator.type === IndicatorType.PERCENTAGE ||
                    indicator.type === IndicatorType.CURRENCY
                      ? "0.01"
                      : undefined
                  }
                  placeholder={
                    indicator.type === IndicatorType.NUMBER ||
                    indicator.type === IndicatorType.PERCENTAGE ||
                    indicator.type === IndicatorType.CURRENCY
                      ? "e.g. 45"
                      : "e.g. Completed"
                  }
                  value={entryValue}
                  onChange={(e) => setEntryValue(e.target.value)}
                  className="w-full rounded-md border-slate-300 border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                />
                {(indicator.type === IndicatorType.NUMBER ||
                  indicator.type === IndicatorType.PERCENTAGE ||
                  indicator.type === IndicatorType.CURRENCY) && (
                  <p className="text-xs text-slate-400 mt-1">
                    Expected range: {indicator.minExpected} -{" "}
                    {indicator.maxExpected}
                  </p>
                )}
              </div>

              {/* Category Selection (for categorical indicators only) */}
              {indicator.type === IndicatorType.CATEGORICAL &&
                indicator.categories &&
                indicator.categories.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Category
                    </label>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto border border-slate-200 rounded-md p-2 bg-slate-50">
                      {indicator.categories.map((cat: CategoryDefinition) => {
                        const isChecked = selectedCategories.includes(cat.id);
                        const allowMultiple =
                          indicator.categoryConfig?.allowMultiple ?? false;

                        return (
                          <label
                            key={cat.id}
                            className="flex items-center p-1.5 border border-slate-300 rounded cursor-pointer hover:bg-white transition-colors"
                            style={{
                              borderColor: isChecked ? cat.color : undefined,
                              backgroundColor: isChecked
                                ? `${cat.color}15`
                                : undefined,
                            }}
                          >
                            <input
                              type={allowMultiple ? "checkbox" : "radio"}
                              name="category-selection"
                              checked={isChecked}
                              onChange={() =>
                                handleCategoryToggle(cat.id, allowMultiple)
                              }
                              className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-slate-300"
                            />
                            <div className="ml-2 flex items-center gap-1.5">
                              <div
                                className="w-2.5 h-2.5 rounded"
                                style={{ backgroundColor: cat.color }}
                              />
                              <span className="text-xs font-medium text-slate-900">
                                {cat.label}
                              </span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

              {/* Evidence / File Upload */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Verification
                </label>
                {attachedFile ? (
                  <div className="w-full px-3 py-2 border border-blue-200 bg-blue-50 rounded-md flex items-center justify-between animate-in fade-in">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span className="text-sm text-blue-900 truncate">
                        {attachedFile.name}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAttachedFile(null)}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    className={`relative transition-all duration-200 rounded-md border-2 ${
                      isDragging
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-300 border-dashed bg-white hover:border-slate-400"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <input
                      type="text"
                      placeholder={
                        isDragging ? "Drop file..." : "Link or drag file"
                      }
                      className={`w-full px-3 py-2 bg-transparent text-sm focus:outline-none pl-9 rounded-md z-10 relative ${isDragging ? "pointer-events-none" : ""}`}
                      value={evidence}
                      onChange={(e) => setEvidence(e.target.value)}
                    />
                    <LinkIcon
                      className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isDragging ? "text-blue-500" : "text-slate-400"}`}
                    />

                    {!evidence && (
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <label
                          className="cursor-pointer p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 block transition-colors"
                          title="Upload File"
                        >
                          <UploadCloud className="w-4 h-4" />
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) =>
                              e.target.files?.[0] &&
                              setAttachedFile(e.target.files[0])
                            }
                          />
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" isLoading={saving}>
                <Save className="w-4 h-4 mr-2" />
                Save Entry
              </Button>
            </form>
          </div>

          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200">
            <h4 className="font-semibold text-slate-900 text-sm mb-3">
              Indicator Details
            </h4>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Target</dt>
                <dd className="font-medium text-slate-900">
                  {indicator.type === IndicatorType.CATEGORICAL &&
                  indicator.targetCategory
                    ? formatCategoryValue(indicator.targetCategory)
                    : indicator.target}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Baseline</dt>
                <dd className="font-medium text-slate-900">
                  {indicator.type === IndicatorType.CATEGORICAL &&
                  indicator.baselineCategory
                    ? formatCategoryValue(indicator.baselineCategory)
                    : indicator.baseline}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Frequency</dt>
                <dd className="font-medium text-slate-900">
                  {indicator.frequency}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Import/Export Modals */}
      <ImportWizard
        indicatorId={indicator.id}
        isOpen={showImportWizard}
        onClose={() => setShowImportWizard(false)}
        onSuccess={() => {
          // Reload indicator data
          Promise.all([
            api.getIndicator(indicator.id),
            api.getIndicatorSubmissions(indicator.id),
          ])
            .then(([data, submissions]) => {
              setIndicator({ ...data, values: submissions });
            })
            .catch(console.error);
        }}
      />

      <ExportDialog
        indicatorId={indicator.id}
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        categories={indicator.categories}
      />
    </Layout>
  );
};
