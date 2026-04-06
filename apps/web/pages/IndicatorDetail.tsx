import React, { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Indicator, IndicatorType, CategoryDefinition } from "../types";
import { api } from "../services/api";
import { Layout } from "../components/Layout";
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
  BellRing,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

// Components
import { AnomalyReviewPanel } from "../components/indicator/AnomalyReviewPanel";
import { MLEvaluationPanel } from "../components/indicator/MLEvaluationPanel";
import { ReportingHealthCard } from "../components/indicator/ReportingHealthCard";
import { ReminderSettingsCard } from "../components/indicator/ReminderSettingsCard";
import { SubmissionHistoryTable } from "../components/indicator/SubmissionHistoryTable";
import { IndicatorDataEntryForm } from "../components/indicator/IndicatorDataEntryForm";
import { IndicatorMetadataSummary } from "../components/indicator/IndicatorMetadataSummary";

// Utilities
import {
  formatDate,
  formatCategoryValue,
  formatCategoricalDisplay,
  inferAnomalyReason,
  isNumericInputType,
} from "../services/indicatorUtils";

export const IndicatorDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [indicator, setIndicator] = useState<Indicator | undefined>(undefined);
  const [project, setProject] = useState<any>(null);
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
        disaggregationKey?: string;
        evidence: string;
      }
    >
  >({});
  const [isEditingSettings, setIsEditingSettings] = useState(false);
  const [settingsForm, setSettingsForm] = useState({
    frequency: "Weekly" as Indicator["frequency"],
    reminderEnabled: false,
    reminderDaysBeforeDue: 1,
    reminderDaysAfterDue: 1,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [refreshCounter, setRefreshCounter] = useState(0);


  const buildSubmissionValue = (
    type: IndicatorType,
    rawValue: string,
    categoryValue?: string,
  ) => {
    if (type === IndicatorType.CATEGORICAL) {
      // For categorical, rawValue is usually a number/count, 
      // categoryValue stores the actual category IDs.
      // We return rawValue here so it saves to the 'value' field.
      return rawValue || categoryValue || "";
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
      
      // Fetch project context for health reporting
      if (data.projectId) {
        api.getProject(data.projectId).then(setProject).catch(() => null);
      }
    } catch (loadError) {
      console.error("Failed to load indicator", loadError);
      setIndicator(undefined);
    } finally {
      setLoading(false);
      setRefreshCounter((prev) => prev + 1);
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

    // Auto-set the best suggested date
    const today = new Date();
    const maxOffset = indicator.frequency === "Daily" ? 7 : 4;
    let foundDate = false;

    for (let offset = 0; offset < maxOffset; offset++) {
      let dateStr = "";
      const d = new Date(today);
      if (indicator.frequency === "Daily") {
        dateStr = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset)
          .toISOString()
          .split("T")[0];
      } else if (indicator.frequency === "Weekly") {
        const diff = d.getDate() - d.getDay() - offset * 7;
        dateStr = new Date(d.getFullYear(), d.getMonth(), diff)
          .toISOString()
          .split("T")[0];
      } else if (indicator.frequency === "Monthly") {
        dateStr = new Date(d.getFullYear(), d.getMonth() - offset, 0)
          .toISOString()
          .split("T")[0];
      }

      const isDone = indicator.values.some((v) => v.date.startsWith(dateStr));
      if (!isDone) {
        setEntryDate(dateStr);
        foundDate = true;
        break;
      }
    }

    if (!foundDate) {
      setEntryDate(today.toISOString().split("T")[0]);
    }

    // Initialize settings form
    setSettingsForm({
      frequency: indicator.frequency,
      reminderEnabled: indicator.reminderEnabled || false,
      reminderDaysBeforeDue: indicator.reminderDaysBeforeDue || 1,
      reminderDaysAfterDue: indicator.reminderDaysAfterDue || 1,
    });
  }, [indicator?.id, indicator?.frequency, indicator?.reminderEnabled, indicator?.reminderDaysBeforeDue, indicator?.reminderDaysAfterDue]);

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
    const reportingFrequency =
      indicator.frequency === "Daily"
        ? "DAILY"
        : indicator.frequency === "Weekly"
          ? "WEEKLY"
          : indicator.frequency === "Monthly"
            ? "MONTHLY"
            : indicator.frequency === "Quarterly"
              ? "QUARTERLY"
              : "YEARLY";
    api
      .getReportingGaps(indicator.id, reportingFrequency)
      .then((result) => setReportingGaps(result.gaps || []))
      .catch(() => setReportingGaps([]));
  }, [indicator?.id, indicator?.frequency]);

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

    // Build composite disaggregation key from ALL dimensions that have values
    let compositeDisaggregationKey = "";
    if (disaggregationDimensions.length > 0) {
      const parts = disaggregationDimensions
        .map((dim) => {
          const dimKey = dim.key || dim.label;
          const value = selectedDisaggregationValues[dimKey]?.trim() || "";
          return value ? { dimKey, value } : null;
        })
        .filter(Boolean) as { dimKey: string; value: string }[];

      if (parts.length === 1) {
        // Single dimension: keep simple value for backward compatibility
        compositeDisaggregationKey = parts[0].value;
      } else if (parts.length > 1) {
        // Multiple dimensions: use composite format
        compositeDisaggregationKey = parts
          .map((p) => `${p.dimKey}:${p.value}`)
          .join("|");
      }
    }

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
        disaggregationKey: compositeDisaggregationKey || undefined,
      }, attachedFile);
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
    return false;
  };

  const startRowEdit = (row: Indicator["values"][number]) => {
    setEditingRows((prev) => ({
      ...prev,
      [row.id]: {
        reportedAt: row.date ? row.date.slice(0, 10) : "",
        value: String(row.value ?? ""),
        categoryValue: row.categoryValue ?? "",
        disaggregationKey: row.disaggregationKey ?? "",
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
        disaggregationKey: row.disaggregationKey || undefined,
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

  const handleUpdateSettings = async () => {
    if (!indicator) return;
    setSaving(true);
    try {
      await api.updateIndicator(indicator.id, {
        frequency: settingsForm.frequency,
        reminderEnabled: settingsForm.reminderEnabled,
        reminderDaysBeforeDue: settingsForm.reminderDaysBeforeDue,
        reminderDaysAfterDue: settingsForm.reminderDaysAfterDue,
      });
      setIsEditingSettings(false);
      await reloadIndicator(showDeleted);
    } catch (err: any) {
      setError(err?.message || "Failed to update settings.");
    }
    setSaving(false);
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

  const isNumeric =
    indicator?.type === IndicatorType.NUMBER ||
    indicator?.type === IndicatorType.PERCENTAGE ||
    indicator?.type === IndicatorType.CURRENCY;
  const isCategorical = indicator?.type === IndicatorType.CATEGORICAL;

  const [filterDisaggregation, setFilterDisaggregation] = useState<string | null>(null);

  // Sort and paginate values for table
  const tableValues = useMemo(() => {
    let values = indicator?.values ?? [];

    // Filter by disaggregation if set
    if (filterDisaggregation) {
      values = values.filter((v) => v.disaggregationKey === filterDisaggregation);
    }

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
  }, [indicator?.values, sortField, sortOrder, filterDisaggregation]);

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

  // Filtered indicator for charts
  const filteredIndicator = useMemo(() => {
    if (!indicator || !filterDisaggregation) return indicator;
    return {
      ...indicator,
      values: indicator.values.filter((v) => v.disaggregationKey === filterDisaggregation),
    };
  }, [indicator, filterDisaggregation]);

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
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-8">
          {/* Charts Section */}
          {(isNumeric || isCategorical) && (
            <IndicatorCharts 
              indicator={filteredIndicator!} 
              refreshCounter={refreshCounter}
            />
          )}


          {/* Time-Series Chart for Categorical Indicators */}
          {indicator.type === IndicatorType.CATEGORICAL &&
            indicator.categories &&
            indicator.categories.length > 0 && (
              <CategoryTimeSeriesChart
                indicatorId={indicator.id}
                categories={indicator.categories}
                refreshCounter={refreshCounter}
              />

            )}


            <MLEvaluationPanel
            indicator={indicator}
            onRescore={() => reloadIndicator(showDeleted)}
          />

          <AnomalyReviewPanel indicator={indicator} anomalies={anomalies} />

          <ReportingHealthCard
            indicator={indicator}
            project={project}
            reportingGaps={reportingGaps}
            anomalies={anomalies}
          />

          <ReminderSettingsCard
            indicator={indicator}
            isEditingSettings={isEditingSettings}
            setIsEditingSettings={setIsEditingSettings}
            settingsForm={settingsForm}
            setSettingsForm={setSettingsForm}
            handleUpdateSettings={handleUpdateSettings}
            saving={saving}
          />

          {indicator.type === IndicatorType.CATEGORICAL &&
            indicator.categories &&
            indicator.categories.length > 0 &&
            indicator.categoryConfig?.disaggregationDimensions &&
            indicator.categoryConfig.disaggregationDimensions.length > 0 && (
              <DisaggregationComparison
                indicatorId={indicator.id}
                categories={indicator.categories as any}
                dimensionLabel={
                  indicator.categoryConfig.disaggregationDimensions[0].label ||
                  "Entity"
                }
                onSelectDisaggregation={setFilterDisaggregation}
                selectedKey={filterDisaggregation}
                refreshCounter={refreshCounter}
              />
            )}

          {filterDisaggregation && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-4 py-2 rounded-lg">
              <div className="text-xs font-semibold text-blue-800 uppercase tracking-wider">
                Active Filter:
              </div>
              <div className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded flex items-center gap-1">
                {filterDisaggregation}
                <button
                  onClick={() => setFilterDisaggregation(null)}
                  className="hover:text-blue-200 ml-1 font-black"
                >
                  ×
                </button>
              </div>
              <button
                onClick={() => setFilterDisaggregation(null)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear all filters
              </button>
            </div>
          )}

          <SubmissionHistoryTable
            indicator={indicator}
            tableValues={tableValues}
            pagedValues={pagedValues}
            totalRows={totalRows}
            totalPages={totalPages}
            currentPage={currentPage}
            pageSize={pageSize}
            showingFrom={showingFrom}
            showingTo={showingTo}
            pageNumbers={pageNumbers}
            sortField={sortField}
            sortOrder={sortOrder}
            selectedRows={selectedRows}
            editingRows={editingRows}
            showDeleted={showDeleted}
            filterDisaggregation={filterDisaggregation}
            canModifyRow={canModifyRow}
            handleSort={handleSort}
            toggleSelectAll={toggleSelectAll}
            toggleRowSelected={toggleRowSelected}
            setEditingRows={setEditingRows}
            startRowEdit={startRowEdit}
            cancelRowEdit={cancelRowEdit}
            saveRowEdit={saveRowEdit}
            deleteRow={deleteRow}
            restoreRow={restoreRow}
            setCurrentPage={setCurrentPage}
            setPageSize={setPageSize}
            safeCurrentPage={safeCurrentPage}
            setFilterDisaggregation={setFilterDisaggregation}
            setShowDeleted={setShowDeleted}
            handleBatchDelete={handleBatchDelete}
            handleBatchRestore={handleBatchRestore}
            setShowImportWizard={setShowImportWizard}
            handleDownloadCsvTemplate={handleDownloadCsvTemplate}
            setShowExportDialog={setShowExportDialog}
          />
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-8">
          <IndicatorDataEntryForm
            indicator={indicator}
            entryDate={entryDate}
            setEntryDate={setEntryDate}
            entryValue={entryValue}
            setEntryValue={setEntryValue}
            evidence={evidence}
            setEvidence={setEvidence}
            attachedFile={attachedFile}
            setAttachedFile={setAttachedFile}
            selectedCategories={selectedCategories}
            handleCategoryToggle={handleCategoryToggle}
            selectedDisaggregationValues={selectedDisaggregationValues}
            setSelectedDisaggregationValues={setSelectedDisaggregationValues}
            handleSave={handleSave}
            saving={saving}
            error={error}
            isDragging={isDragging}
            handleDragOver={handleDragOver}
            handleDragLeave={handleDragLeave}
            handleDrop={handleDrop}
          />

          <IndicatorMetadataSummary indicator={indicator} />
        </div>
      </div>

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

