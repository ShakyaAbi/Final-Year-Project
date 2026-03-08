import React, { useEffect, useMemo, useState } from "react";
import { Layout } from "../components/Layout";
import { useParams, Link } from "react-router-dom";
import { Indicator, IndicatorType, CategoryDefinition } from "../types";
import { api } from "../services/api";
import { Button } from "../components/ui/Button";
import { IndicatorCharts } from "../components/IndicatorCharts";
import { ImportWizard } from "../components/ImportWizard";
import { ExportDialog } from "../components/ExportDialog";
import { CategoryTimeSeriesChart } from "../components/CategoryTimeSeriesChart";
import { DisaggregationComparison } from "../components/DisaggregationComparison";
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
  Pencil,
  Trash2,
  RotateCcw,
  CalendarClock,
  BellRing,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const IndicatorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
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
  const [selectedDisaggregationValues, setSelectedDisaggregationValues] =
    useState<Record<string, string>>({});

  const [saving, setSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Table Sort State
  const [sortField, setSortField] = useState<"date" | "value">("date");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Import/Export State
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [reportingFrequency, setReportingFrequency] = useState<
    "DAILY" | "WEEKLY"
  >("WEEKLY");
  const [reportingGaps, setReportingGaps] = useState<any[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    role: string;
  } | null>(null);
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [editingRows, setEditingRows] = useState<
    Record<
      string,
      {
        reportedAt: string;
        value: string;
        categoryValue: string;
        evidence: string;
      }
    >
  >({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const isNumericInputType = (type: IndicatorType) =>
    type === IndicatorType.NUMBER ||
    type === IndicatorType.PERCENTAGE ||
    type === IndicatorType.CURRENCY;

  const buildSubmissionValue = (
    type: IndicatorType,
    rawValue: string,
    categoryValue?: string,
  ) => {
    if (type === IndicatorType.CATEGORICAL) {
      return categoryValue ?? rawValue;
    }
    if (isNumericInputType(type)) {
      return Number(rawValue);
    }
    return rawValue;
  };

  const reloadIndicator = async (includeDeleted = showDeleted) => {
    if (!id) return;
    try {
      const [data, submissions] = await Promise.all([
        api.getIndicator(id),
        api.getIndicatorSubmissions(id, { includeDeleted }),
      ]);
      setIndicator({ ...data, values: submissions });
    } catch (loadError) {
      console.error("Failed to load indicator", loadError);
      setIndicator(undefined);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([reloadIndicator(false), api.me().catch(() => null)]).then(
      ([_, user]) => {
        if (user) setCurrentUser({ id: user.id, role: user.role });
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!id) return;
    reloadIndicator(showDeleted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDeleted]);

  useEffect(() => {
    if (!indicator) return;
    setReportingFrequency(
      indicator.frequency === "Daily" ? "DAILY" : "WEEKLY",
    );
  }, [indicator?.id, indicator?.frequency]);

  useEffect(() => {
    if (!indicator) return;
    const dims = indicator.categoryConfig?.disaggregationDimensions || [];
    if (dims.length === 0) {
      setSelectedDisaggregationValues({});
      return;
    }
    setSelectedDisaggregationValues((prev) => {
      const next: Record<string, string> = {};
      dims.forEach((dim) => {
        const dimKey = dim.key || dim.label;
        const currentValue = prev[dimKey];
        next[dimKey] =
          currentValue && dim.values.includes(currentValue) ? currentValue : "";
      });
      return next;
    });
  }, [indicator?.id]); // reset on indicator change

  useEffect(() => {
    if (!indicator) return;
    api
      .getReportingGaps(indicator.id, reportingFrequency)
      .then((result) => setReportingGaps(result.gaps || []))
      .catch(() => setReportingGaps([]));
  }, [indicator?.id, reportingFrequency]);

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

  const handleDownloadCsvTemplate = async () => {
    if (!indicator) return;
    try {
      const blob = await api.downloadImportTemplateSample(indicator.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `import-template-indicator-${indicator.id}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err?.message || "Failed to download CSV template.");
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

    const hasCategories = !!indicator.categories?.length;
    const categoryRequired = indicator.categoryConfig?.required === true;
    const disaggregationDimensions =
      indicator.categoryConfig?.disaggregationDimensions || [];
    const primaryDisaggregationDimension =
      disaggregationDimensions.find((d) => d.required) ||
      (disaggregationDimensions.length > 0 ? disaggregationDimensions[0] : null);

    if (entryValue === "") return;
    if (
      hasCategories &&
      categoryRequired &&
      selectedCategories.length === 0
    ) {
      return;
    }
    const missingRequiredDimension = disaggregationDimensions.find((dim) => {
      if (!dim.required) return false;
      const dimKey = dim.key || dim.label;
      return !selectedDisaggregationValues[dimKey]?.trim();
    });
    if (missingRequiredDimension) {
      setError(
        `${missingRequiredDimension.label || "Disaggregation"} is required.`,
      );
      return;
    }
    const primaryDisaggregationKey = primaryDisaggregationDimension
      ? selectedDisaggregationValues[
          primaryDisaggregationDimension.key ||
            primaryDisaggregationDimension.label
        ] || ""
      : "";

    setSaving(true);
    setError(null);

    const categoryValuePayload =
      hasCategories && selectedCategories.length > 0
        ? selectedCategories.join(",")
        : undefined;
    const valuePayload = buildSubmissionValue(
      indicator.type,
      entryValue,
      categoryValuePayload,
    );

    const finalEvidence = attachedFile
      ? `[Attached] ${attachedFile.name}`
      : evidence;

    let didError = false;
    try {
      await api.createSubmission(indicator.id, {
        reportedAt: entryDate,
        value: valuePayload,
        evidence: finalEvidence,
        categoryValue: categoryValuePayload,
        disaggregationKey: primaryDisaggregationKey || undefined,
      });
      await reloadIndicator(showDeleted);
    } catch (err: any) {
      didError = true;
      setError(err?.message || "Failed to submit value.");
    }

    if (!didError) {
      setEntryValue("");
      setSelectedCategories([]);
      setSelectedDisaggregationValues((prev) => {
        const next: Record<string, string> = {};
        Object.keys(prev).forEach((key) => {
          next[key] = "";
        });
        return next;
      });
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

  const canModifyRow = (row: Indicator["values"][number]) => {
    if (!currentUser) return true;
    if (currentUser.role === "ADMIN" || currentUser.role === "MANAGER") {
      return true;
    }
    if (currentUser.role !== "DATA_ENTRY") return false;
    if (!row.createdByUserId || row.createdByUserId !== currentUser.id) {
      return false;
    }
    if (!row.createdAt) return false;
    const ageMs = Date.now() - new Date(row.createdAt).getTime();
    return ageMs <= 7 * 24 * 60 * 60 * 1000;
  };

  const startRowEdit = (row: Indicator["values"][number]) => {
    setEditingRows((prev) => ({
      ...prev,
      [row.id]: {
        reportedAt: row.date ? row.date.slice(0, 10) : "",
        value: String(row.value ?? ""),
        categoryValue: row.categoryValue ?? "",
        evidence: row.evidence ?? "",
      },
    }));
  };

  const cancelRowEdit = (rowId: string) => {
    setEditingRows((prev) => {
      const next = { ...prev };
      delete next[rowId];
      return next;
    });
  };

  const saveRowEdit = async (rowId: string) => {
    const row = editingRows[rowId];
    if (!row || !indicator) return;
    try {
      const categoryValuePayload = row.categoryValue || undefined;
      const valuePayload = buildSubmissionValue(
        indicator.type,
        row.value,
        categoryValuePayload,
      );
      await api.updateSubmission(rowId, {
        reportedAt: row.reportedAt,
        value: valuePayload,
        categoryValue: categoryValuePayload,
        evidence: row.evidence || undefined,
      });
      cancelRowEdit(rowId);
      await reloadIndicator(showDeleted);
    } catch (err: any) {
      setError(err?.message || "Failed to update submission.");
    }
  };

  const deleteRow = async (rowId: string) => {
    if (!window.confirm("Soft-delete this submission?")) return;
    try {
      await api.deleteSubmission(rowId);
      setSelectedRows((prev) => {
        const next = new Set(prev);
        next.delete(rowId);
        return next;
      });
      await reloadIndicator(showDeleted);
    } catch (err: any) {
      setError(err?.message || "Failed to delete submission.");
    }
  };

  const restoreRow = async (rowId: string) => {
    try {
      await api.restoreSubmission(rowId);
      await reloadIndicator(showDeleted);
    } catch (err: any) {
      setError(err?.message || "Failed to restore submission.");
    }
  };

  const toggleRowSelected = (rowId: string, checked: boolean) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (checked) next.add(rowId);
      else next.delete(rowId);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean, rows: Indicator["values"]) => {
    if (!checked) {
      setSelectedRows(new Set());
      return;
    }
    setSelectedRows(new Set(rows.map((r) => r.id)));
  };

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedRows);
    if (ids.length === 0) return;
    if (!window.confirm(`Soft-delete ${ids.length} submission(s)?`)) return;
    await Promise.all(ids.map((id) => api.deleteSubmission(id).catch(() => null)));
    setSelectedRows(new Set());
    await reloadIndicator(showDeleted);
  };

  const handleBatchRestore = async () => {
    const ids = Array.from(selectedRows);
    if (ids.length === 0) return;
    await Promise.all(ids.map((id) => api.restoreSubmission(id).catch(() => null)));
    setSelectedRows(new Set());
    await reloadIndicator(showDeleted);
  };

  // Sort and paginate values for table
  const tableValues = useMemo(() => {
    const values = indicator?.values ?? [];
    return [...values].sort((a, b) => {
      if (sortField === "date") {
        return sortOrder === "asc"
          ? new Date(a.date).getTime() - new Date(b.date).getTime()
          : new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      return sortOrder === "asc"
        ? Number(a.value) - Number(b.value)
        : Number(b.value) - Number(a.value);
    });
  }, [indicator?.values, sortField, sortOrder]);

  const totalRows = tableValues.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStart = (safeCurrentPage - 1) * pageSize;
  const pagedValues = tableValues.slice(pageStart, pageStart + pageSize);
  const showingFrom = totalRows === 0 ? 0 : pageStart + 1;
  const showingTo = Math.min(pageStart + pageSize, totalRows);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      setCurrentPage(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage]);

  const pageNumbers = (() => {
    const pages: number[] = [];
    const start = Math.max(1, safeCurrentPage - 2);
    const end = Math.min(totalPages, safeCurrentPage + 2);
    for (let i = start; i <= end; i += 1) pages.push(i);
    return pages;
  })();

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
  const missedEntryCount = reportingGaps.length;

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
    if (!indicator.categories || indicator.categories.length === 0) {
      return String(value ?? "");
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
    categoryValue?: string,
  ): string => {
    const label = formatCategoryValue(categoryValue);
    return label ? `${value ?? "N/A"} (${label})` : String(value ?? "N/A");
  };

  const inferAnomalyReason = (
    value: number | string,
    existing?: string,
    isAnomaly?: boolean,
    score?: number,
    threshold?: number,
  ) => {
    if (!isAnomaly) return "";
    const suffix =
      score !== undefined && threshold !== undefined
        ? ` (score: ${score.toFixed(3)}, threshold: ${threshold.toFixed(3)})`
        : "";
    if (existing && existing.trim()) return `${existing}${suffix}`;
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return `Anomaly detected${suffix}`;
    if (indicator.type === IndicatorType.PERCENTAGE) {
      const lower = indicator.minExpected ?? 0;
      const upper = indicator.maxExpected ?? 100;
      if (numericValue < lower)
        return `Percent must be between ${lower} and ${upper}${suffix}`;
      if (numericValue > upper)
        return `Percent must be between ${lower} and ${upper}${suffix}`;
    }
    if (
      indicator.type === IndicatorType.NUMBER ||
      indicator.type === IndicatorType.CURRENCY
    ) {
      if (
        indicator.minExpected !== undefined &&
        numericValue < indicator.minExpected
      ) {
        return `Value below expected minimum (${indicator.minExpected})${suffix}`;
      }
      if (
        indicator.maxExpected !== undefined &&
        numericValue > indicator.maxExpected
      ) {
        return `Value exceeds expected maximum (${indicator.maxExpected})${suffix}`;
      }
    }
    return `Anomaly detected${suffix}`;
  };

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
          <div className="flex flex-wrap items-center gap-2 md:justify-end">
            <Button size="sm" onClick={() => setShowImportWizard(true)}>
              <UploadCloud className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadCsvTemplate}>
              <Download className="w-4 h-4 mr-2" />
              CSV Template
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExportDialog(true)}
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm">
              <History className="w-4 h-4 mr-2" />
              Definition History
            </Button>
          </div>
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

          {indicator.type === IndicatorType.CATEGORICAL &&
            indicator.categories &&
            indicator.categories.length > 0 &&
            indicator.categoryConfig?.disaggregationDimensions &&
            indicator.categoryConfig.disaggregationDimensions.length > 0 && (
              <DisaggregationComparison
                indicatorId={indicator.id}
                categories={indicator.categories}
                dimensionLabel={
                  indicator.categoryConfig.disaggregationDimensions[0].label ||
                  "Entity"
                }
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
                            Category:{" "}
                            {formatCategoricalDisplay(
                              a.value,
                              a.categoryValue ?? undefined,
                            )}
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
                          a.anomalyScore,
                          a.anomalyThreshold,
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-slate-500" />
                Reporting Health
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Frequency</span>
                <select
                  value={reportingFrequency}
                  onChange={(e) =>
                    setReportingFrequency(e.target.value as "DAILY" | "WEEKLY")
                  }
                  className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                >
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <div className="text-xs text-amber-700 mb-1">Missed Entries</div>
                <div className="text-xl font-bold text-amber-900">
                  {missedEntryCount}
                </div>
              </div>
              <div className="rounded-md border border-red-200 bg-red-50 p-3">
                <div className="text-xs text-red-700 mb-1">Anomaly Flagged</div>
                <div className="text-xl font-bold text-red-900">
                  {anomalies.length}
                </div>
              </div>
            </div>
            {reportingGaps.length > 0 && (
              <div className="mt-4 space-y-2">
                {reportingGaps.slice(0, 3).map((gap, idx) => (
                  <div
                    key={`${gap.from}-${idx}`}
                    className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded p-2 flex items-center gap-2"
                  >
                    <BellRing className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      Gap from {formatDate(gap.from)} to {formatDate(gap.to)} (
                      {gap.daysMissing} days missed)
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Data History Table */}
          <div className="space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TableIcon className="w-5 h-5 text-slate-400" />
                Data History
              </h3>
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs rounded border border-slate-200 bg-white text-slate-600">
                  <input
                    type="checkbox"
                    checked={showDeleted}
                    onChange={(e) => setShowDeleted(e.target.checked)}
                  />
                  Show Deleted
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchDelete}
                  disabled={selectedRows.size === 0}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Delete Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchRestore}
                  disabled={selectedRows.size === 0}
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Restore Selected
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadCsvTemplate}
                >
                  <Download className="w-4 h-4 mr-2" /> CSV Template
                </Button>
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
                      <th className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={
                            pagedValues.length > 0 &&
                            pagedValues.every((row) => selectedRows.has(row.id))
                          }
                          onChange={(e) =>
                            toggleSelectAll(e.target.checked, pagedValues)
                          }
                        />
                      </th>
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
                      <th className="px-6 py-3 sticky right-0 bg-slate-50 z-10">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableValues.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-6 py-8 text-center text-slate-400 italic"
                        >
                          No data entries recorded yet.
                        </td>
                      </tr>
                    ) : (
                      pagedValues.map((row) => {
                        const edit = editingRows[row.id];
                        const editable = canModifyRow(row);
                        return (
                        <tr
                          key={row.id}
                          className={`hover:bg-slate-50 transition-colors ${row.isAnomaly ? "bg-red-50/30" : ""} ${row.deletedAt ? "opacity-60" : ""}`}
                        >
                          <td className="px-4 py-4">
                            <input
                              type="checkbox"
                              checked={selectedRows.has(row.id)}
                              onChange={(e) =>
                                toggleRowSelected(row.id, e.target.checked)
                              }
                            />
                          </td>
                          <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">
                            {edit ? (
                              <input
                                type="date"
                                value={edit.reportedAt}
                                onChange={(e) =>
                                  setEditingRows((prev) => ({
                                    ...prev,
                                    [row.id]: {
                                      ...prev[row.id],
                                      reportedAt: e.target.value,
                                    },
                                  }))
                                }
                                className="px-2 py-1 border border-slate-300 rounded"
                              />
                            ) : (
                              formatDate(row.date)
                            )}
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-700">
                            {edit ? (
                              <input
                                type="text"
                                value={edit.value}
                                onChange={(e) =>
                                  setEditingRows((prev) => ({
                                    ...prev,
                                    [row.id]: {
                                      ...prev[row.id],
                                      value: e.target.value,
                                    },
                                  }))
                                }
                                className="px-2 py-1 border border-slate-300 rounded w-28"
                              />
                            ) : (
                              <>
                                {formatCategoricalDisplay(
                                  row.value,
                                  row.categoryValue ?? undefined,
                                )}
                                <span className="text-xs text-slate-400 ml-1">
                                  {indicator.unit}
                                </span>
                              </>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {row.isAnomaly ? (
                              <div
                                className="flex items-center gap-2 text-red-600"
                                title={inferAnomalyReason(
                                  row.value,
                                  row.anomalyReason,
                                  row.isAnomaly,
                                  row.anomalyScore,
                                  row.anomalyThreshold,
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
                                  row.anomalyScore,
                                  row.anomalyThreshold,
                                )}
                              >
                                {inferAnomalyReason(
                                  row.value,
                                  row.anomalyReason,
                                  row.isAnomaly,
                                  row.anomalyScore,
                                  row.anomalyThreshold,
                                )}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {edit ? (
                              <div className="space-y-2">
                                <input
                                  type="text"
                                  value={edit.evidence}
                                  onChange={(e) =>
                                    setEditingRows((prev) => ({
                                      ...prev,
                                      [row.id]: {
                                        ...prev[row.id],
                                        evidence: e.target.value,
                                      },
                                    }))
                                  }
                                  className="px-2 py-1 border border-slate-300 rounded w-48"
                                />
                                <div className="flex items-center gap-2 md:hidden">
                                  <button
                                    className="text-xs px-2 py-1 border rounded text-green-700 border-green-200 bg-green-50"
                                    onClick={() => saveRowEdit(row.id)}
                                  >
                                    Save
                                  </button>
                                  <button
                                    className="text-xs px-2 py-1 border rounded text-slate-700 border-slate-200"
                                    onClick={() => cancelRowEdit(row.id)}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : row.evidence ? (
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
                          <td className="px-6 py-4 sticky right-0 bg-white z-10 shadow-[-8px_0_8px_-8px_rgba(15,23,42,0.15)]">
                            <div className="flex items-center gap-2">
                              {edit ? (
                                <>
                                  <button
                                    className="text-xs px-2 py-1 border rounded text-green-700 border-green-200 bg-green-50"
                                    onClick={() => saveRowEdit(row.id)}
                                  >
                                    Save
                                  </button>
                                  <button
                                    className="text-xs px-2 py-1 border rounded text-slate-700 border-slate-200"
                                    onClick={() => cancelRowEdit(row.id)}
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <>
                                  {!row.deletedAt && (
                                    <button
                                      className="text-xs px-2 py-1 border rounded text-blue-700 border-blue-200 disabled:opacity-40"
                                      disabled={!editable}
                                      onClick={() => startRowEdit(row)}
                                      title={
                                        editable
                                          ? "Edit"
                                          : "You cannot edit this submission"
                                      }
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                  )}
                                  {!row.deletedAt ? (
                                    <button
                                      className="text-xs px-2 py-1 border rounded text-red-700 border-red-200 disabled:opacity-40"
                                      disabled={!editable}
                                      onClick={() => deleteRow(row.id)}
                                      title={
                                        editable
                                          ? "Delete"
                                          : "You cannot delete this submission"
                                      }
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  ) : (
                                    <button
                                      className="text-xs px-2 py-1 border rounded text-amber-700 border-amber-200"
                                      onClick={() => restoreRow(row.id)}
                                      title="Restore"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      )})
                    )}
                  </tbody>
                </table>
              </div>
              <div className="border-t border-slate-200 px-4 py-3 bg-slate-50/60">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <span>
                      Showing <span className="font-semibold">{showingFrom}</span>
                      {" - "}
                      <span className="font-semibold">{showingTo}</span> of{" "}
                      <span className="font-semibold">{totalRows}</span> entries
                    </span>
                    <span>
                      Selected:{" "}
                      <span className="font-semibold">{selectedRows.size}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="text-xs text-slate-600">Rows</label>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="text-xs border border-slate-300 rounded px-2 py-1 bg-white"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-slate-300 rounded bg-white disabled:opacity-40"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={safeCurrentPage <= 1}
                    >
                      <ChevronLeft className="w-3 h-3" />
                      Prev
                    </button>
                    {safeCurrentPage > 3 && (
                      <>
                        <button
                          type="button"
                          className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                          onClick={() => setCurrentPage(1)}
                        >
                          1
                        </button>
                        <span className="px-1 text-xs text-slate-400">...</span>
                      </>
                    )}
                    {pageNumbers.map((page) => (
                      <button
                        key={page}
                        type="button"
                        className={`px-2 py-1 text-xs border rounded ${
                          page === safeCurrentPage
                            ? "border-blue-300 bg-blue-50 text-blue-700"
                            : "border-slate-300 bg-white"
                        }`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </button>
                    ))}
                    {safeCurrentPage < totalPages - 2 && (
                      <>
                        <span className="px-1 text-xs text-slate-400">...</span>
                        <button
                          type="button"
                          className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                          onClick={() => setCurrentPage(totalPages)}
                        >
                          {totalPages}
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 px-2 py-1 text-xs border border-slate-300 rounded bg-white disabled:opacity-40"
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={safeCurrentPage >= totalPages}
                    >
                      Next
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
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
                    isNumericInputType(indicator.type) ? "number" : "text"
                  }
                  step={
                    isNumericInputType(indicator.type) ? "0.01" : undefined
                  }
                  placeholder={
                    isNumericInputType(indicator.type)
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

              {/* Category Selection */}
              {indicator.categories && indicator.categories.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Category{" "}
                      {indicator.categoryConfig?.required && (
                        <span className="text-red-500">*</span>
                      )}
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

              {/* Disaggregation Selection (categorical only) */}
              {indicator.type === IndicatorType.CATEGORICAL &&
                indicator.categoryConfig?.disaggregationDimensions &&
                indicator.categoryConfig.disaggregationDimensions.length > 0 && (
                  <div>
                    {(() => {
                      const dims =
                        indicator.categoryConfig?.disaggregationDimensions || [];
                      const primaryDim = dims.find((d) => d.required) || dims[0];
                      return (
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <label className="block text-sm font-medium text-slate-700">
                              Disaggregation
                            </label>
                            {primaryDim && (
                              <span className="text-[11px] text-slate-500">
                                Saved key: {primaryDim.label || "Primary"}
                              </span>
                            )}
                          </div>
                          {dims.map((dim) => {
                            const dimKey = dim.key || dim.label;
                            const selectedValue =
                              selectedDisaggregationValues[dimKey] || "";
                            return (
                              <div key={dimKey}>
                                <label className="block text-xs font-medium text-slate-600 mb-1">
                                  {dim.label || "Dimension"}{" "}
                                  {dim.required && (
                                    <span className="text-red-500">*</span>
                                  )}
                                </label>
                                <select
                                  value={selectedValue}
                                  onChange={(e) =>
                                    setSelectedDisaggregationValues((prev) => ({
                                      ...prev,
                                      [dimKey]: e.target.value,
                                    }))
                                  }
                                  className="w-full rounded-md border-slate-300 border p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                >
                                  <option value="">
                                    Select {dim.label || "value"}
                                  </option>
                                  {dim.values.map((value) => (
                                    <option key={value} value={value}>
                                      {value}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            );
                          })}
                          {dims.length > 1 && (
                            <p className="text-xs text-slate-500">
                              Choose values for each dimension; the primary
                              dimension is used for submission grouping.
                            </p>
                          )}
                        </div>
                      );
                    })()}
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
                  {indicator.type === IndicatorType.CATEGORICAL ? (
                    indicator.targetCategory ? (
                      formatCategoryValue(indicator.targetCategory)
                    ) : indicator.target === undefined ||
                      indicator.target === null ||
                      indicator.target === "" ? (
                      "No target set"
                    ) : (
                      indicator.target
                    )
                  ) : (
                    indicator.target
                  )}
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
          reloadIndicator(showDeleted).catch(console.error);
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
