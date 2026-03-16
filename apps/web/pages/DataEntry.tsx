import React, { useState, useEffect } from "react";
import { Layout } from "../components/Layout";
import { api } from "../services/api";
import {
  Project,
  Indicator,
  IndicatorType,
  IndicatorValue,
  CategoryDefinition,
} from "../types";
import { Button } from "../components/ui/Button";
import {
  Search,
  Filter,
  Check,
  FileText,
  Calendar,
  AlertCircle,
  Link as LinkIcon,
  UploadCloud,
  X,
  FileBox,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { extractTextFromPDF, parseDataFromText } from "../utils/pdfParser";

export const DataEntry: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [indicators, setIndicators] = useState<Indicator[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionsByIndicator, setSubmissionsByIndicator] = useState<
    Record<string, IndicatorValue[]>
  >({});
  const [showDeleted, setShowDeleted] = useState(false);
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<Set<string>>(
    new Set(),
  );
  const [editingSubmissionRows, setEditingSubmissionRows] = useState<
    Record<
      string,
      {
        indicatorId: string;
        reportedAt: string;
        value: string;
        categoryValue: string;
        evidence: string;
      }
    >
  >({});
  const [currentUser, setCurrentUser] = useState<{
    id: string;
    role: string;
  } | null>(null);

  const [searchParams] = useSearchParams();

  // Filters
  const [selectedProject, setSelectedProject] = useState<string>(
    searchParams.get("projectId") || "",
  );
  const [searchQuery, setSearchQuery] = useState("");

  // UI State for Drag & Drop
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Form State (Map of indicatorId -> Entry Data)
  const [entries, setEntries] = useState<
    Record<
      string,
      {
        value: string;
        selectedCategories: string[]; // For categorical indicators
        date: string;
        evidence: string;
        file: File | null;
        status: "idle" | "saving" | "saved";
        error?: string;
      }
    >
  >({});

  const [parsingPdfId, setParsingPdfId] = useState<string | null>(null);

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

  useEffect(() => {
    const pid = searchParams.get("projectId");
    if (pid) setSelectedProject(pid);
  }, [searchParams]);

  useEffect(() => {
    api
      .getProjects()
      .then((projData) => setProjects(projData))
      .catch((error) => {
        console.error("Failed to load projects", error);
        setProjects([]);
      });
    api
      .me()
      .then((user) => setCurrentUser({ id: user.id, role: user.role }))
      .catch(() => setCurrentUser(null));
  }, []);

  const refreshSubmissions = async (
    indicatorIds: string[],
    includeDeleted = showDeleted,
  ) => {
    if (indicatorIds.length === 0) {
      setSubmissionsByIndicator({});
      return;
    }
    const pairs = await Promise.all(
      indicatorIds.map(async (indicatorId) => {
        const values = await api.getIndicatorSubmissions(indicatorId, {
          includeDeleted,
        });
        return [indicatorId, values] as const;
      }),
    );
    setSubmissionsByIndicator(Object.fromEntries(pairs));
  };

  const loadIndicators = async (projectId?: string) => {
    setLoading(true);
    try {
      let indData: Indicator[] = [];
      if (projectId) {
        indData = await api.getIndicators(projectId);
      } else if (projects.length > 0) {
        const all = await Promise.all(
          projects.map((project) => api.getIndicators(project.id)),
        );
        indData = all.flat();
      }
      setIndicators(indData);

      const initialEntries: Record<string, any> = {};
      const today = new Date().toISOString().split("T")[0];
      indData.forEach((ind) => {
        initialEntries[ind.id] = {
          value: "",
          selectedCategories: [],
          date: today,
          evidence: "",
          file: null,
          status: "idle",
          error: undefined,
        };
      });
      setEntries(initialEntries);
      await refreshSubmissions(indData.map((ind) => ind.id));
    } catch (error) {
      console.error("Failed to load indicators", error);
      setIndicators([]);
      setEntries({});
      setSubmissionsByIndicator({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projects.length > 0) {
      loadIndicators(selectedProject || undefined);
    }
  }, [projects, selectedProject]);

  useEffect(() => {
    refreshSubmissions(indicators.map((ind) => ind.id), showDeleted).catch(
      (error) => {
        console.error("Failed to refresh submissions", error);
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDeleted]);

  const filteredIndicators = indicators.filter((ind) => {
    const matchesProject = selectedProject
      ? ind.projectId === selectedProject
      : true;
    const matchesSearch =
      ind.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ind.code && ind.code.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesProject && matchesSearch;
  });

  // Helper to format category values for display
  const formatCategoryValue = (
    value: string | number | undefined,
    indicator: Indicator,
  ): string => {
    if (!indicator.categories || indicator.categories.length === 0) {
      return String(value ?? "");
    }
    if (value === undefined || value === null || value === "") return "";

    // Value might be comma-separated category IDs
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
    value: string | number,
    categoryValue: string | undefined,
    indicator: Indicator,
  ): string => {
    const label = formatCategoryValue(categoryValue, indicator);
    return label ? `${value} (${label})` : String(value);
  };

  const handleEntryChange = (id: string, field: string, value: string) => {
    setEntries((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value, status: "idle", error: undefined },
    }));
  };

  const handleCategoryToggle = (
    indicatorId: string,
    categoryId: string,
    allowMultiple: boolean,
  ) => {
    setEntries((prev) => {
      const current = prev[indicatorId]?.selectedCategories || [];
      let newSelected: string[];

      if (allowMultiple) {
        // Toggle in multi-select mode
        newSelected = current.includes(categoryId)
          ? current.filter((id) => id !== categoryId)
          : [...current, categoryId];
      } else {
        // Single select mode - replace
        newSelected = [categoryId];
      }

      return {
        ...prev,
        [indicatorId]: {
          ...prev[indicatorId],
          selectedCategories: newSelected,
          status: "idle",
          error: undefined,
        },
      };
    });
  };

  // Drag & Drop Handlers
  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggingId !== id) setDraggingId(id);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDraggingId(null);
  };

  const handleDrop = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    setDraggingId(null);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      handleFileSelect(id, file);
    }
  };

  const handleFileSelect = (id: string, file: File) => {
    setEntries((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        file: file,
        evidence: "", // Clear manual text if file is attached to avoid ambiguity
        status: "idle",
        error: undefined,
      },
    }));
  };

  const handleRemoveFile = (id: string) => {
    setEntries((prev) => ({
      ...prev,
      [id]: { ...prev[id], file: null },
    }));
  };

  const handleAutoFillPdf = async (id: string, file: File) => {
    if (file.type !== "application/pdf") {
      alert("Please upload a valid PDF file.");
      return;
    }
    setParsingPdfId(id);
    try {
      const text = await extractTextFromPDF(file);
      const parsed = parseDataFromText(text);

      setEntries((prev) => {
        const current = prev[id];
        return {
          ...prev,
          [id]: {
            ...current,
            // Keep first 5000 chars as evidence to avoid extreme payloads
            evidence: parsed.text.substring(0, 5000) + (parsed.text.length > 5000 ? "..." : ""),
            date: parsed.suggestedDate || current.date,
            value: parsed.suggestedValue || current.value,
            file: file,
          },
        };
      });
    } catch (err) {
      console.error(err);
      alert("Failed to parse PDF data.");
    } finally {
      setParsingPdfId(null);
    }
  };

  const handleSubmit = async (id: string) => {
    const entry = entries[id];
    const indicator = indicators.find((item) => item.id === id);
    const hasCategories = !!indicator?.categories?.length;
    const categoryRequired = indicator?.categoryConfig?.required === true;

    // For CATEGORICAL: check selectedCategories, for others: check value
    const hasValue =
      indicator?.type === IndicatorType.BOOLEAN ||
      indicator?.type === IndicatorType.TEXT
        ? entry.value !== ""
        : entry.value !== "";

    const hasCategory =
      !hasCategories ||
      (entry.selectedCategories || []).length > 0 ||
      !categoryRequired;

    if (!hasValue || !hasCategory) return;

    setEntries((prev) => ({
      ...prev,
      [id]: { ...prev[id], status: "saving", error: undefined },
    }));

    // Use filename if file exists, otherwise use the text evidence
    const finalEvidence = entry.file
      ? `[Attached] ${entry.file.name}`
      : entry.evidence;

    // Call service
    // For CATEGORICAL: value is the category ID(s), for others: value is numeric/text
    const categoryValuePayload =
      hasCategories && (entry.selectedCategories || []).length > 0
        ? (entry.selectedCategories || []).join(",")
        : undefined;
    const valuePayload = buildSubmissionValue(
      indicator?.type || IndicatorType.TEXT,
      entry.value,
      categoryValuePayload,
    );

    try {
      await api.createSubmission(id, {
        reportedAt: entry.date,
        value: valuePayload,
        evidence: finalEvidence,
        categoryValue: categoryValuePayload,
      });
    } catch (err: any) {
      setEntries((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          status: "idle",
          error: err?.message || "Failed to submit value.",
        },
      }));
      return;
    }

    // Optimistically update the indicators list to show the new "Last Value" immediately
    setIndicators((prevIndicators) =>
      prevIndicators.map((ind) => {
        if (ind.id === id) {
          // Parse value same way the service does for consistency in UI
          const categoryValue =
            (entry.selectedCategories || []).length > 0
              ? entry.selectedCategories.join(",")
              : undefined;
          const finalValue = buildSubmissionValue(
            ind.type,
            entry.value,
            categoryValue,
          );

          const newEntry: IndicatorValue = {
            id: `temp-${Date.now()}`,
            date: entry.date,
            value: finalValue,
            categoryValue,
            isAnomaly: false, // simplified for optimistic update
            evidence: finalEvidence,
          };
          return {
            ...ind,
            values: [...ind.values, newEntry],
          };
        }
        return ind;
      }),
    );
    refreshSubmissions([id], showDeleted).catch((error) => {
      console.error("Failed to refresh submissions", error);
    });

    // Simulate success delay for UX
    setTimeout(() => {
      setEntries((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          value: "",
          selectedCategories: [],
          evidence: "",
          file: null,
          status: "saved",
        },
      }));

      // Reset to idle after showing success
      setTimeout(() => {
        setEntries((prev) => ({
          ...prev,
          [id]: { ...prev[id], status: "idle" },
        }));
      }, 2000);
    }, 600);
  };

  const getProjectName = (projectId: string) => {
    return projects.find((p) => p.id === projectId)?.name || "Unknown Project";
  };

  const getInputType = (type: IndicatorType) => {
    return isNumericInputType(type) ? "number" : "text";
  };

  const canModifySubmission = (row: IndicatorValue) => {
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

  const beginEditSubmission = (indicatorId: string, row: IndicatorValue) => {
    setEditingSubmissionRows((prev) => ({
      ...prev,
      [row.id]: {
        indicatorId,
        reportedAt: row.date.slice(0, 10),
        value: String(row.value ?? ""),
        categoryValue: row.categoryValue ?? "",
        evidence: row.evidence ?? "",
      },
    }));
  };

  const cancelEditSubmission = (submissionId: string) => {
    setEditingSubmissionRows((prev) => {
      const next = { ...prev };
      delete next[submissionId];
      return next;
    });
  };

  const saveEditedSubmission = async (submissionId: string) => {
    const edit = editingSubmissionRows[submissionId];
    if (!edit) return;
    const indicator = indicators.find((ind) => ind.id === edit.indicatorId);
    if (!indicator) return;
    try {
      const valuePayload = buildSubmissionValue(
        indicator.type,
        edit.value,
        edit.categoryValue || undefined,
      );
      await api.updateSubmission(submissionId, {
        reportedAt: edit.reportedAt,
        value: valuePayload,
        categoryValue: edit.categoryValue || undefined,
        evidence: edit.evidence || undefined,
      });
      cancelEditSubmission(submissionId);
      await refreshSubmissions([edit.indicatorId], showDeleted);
    } catch (error) {
      console.error("Failed to update submission", error);
    }
  };

  const softDeleteSubmission = async (indicatorId: string, submissionId: string) => {
    if (!window.confirm("Soft-delete this submission?")) return;
    try {
      await api.deleteSubmission(submissionId);
      await refreshSubmissions([indicatorId], showDeleted);
      setSelectedSubmissionIds((prev) => {
        const next = new Set(prev);
        next.delete(submissionId);
        return next;
      });
    } catch (error) {
      console.error("Failed to delete submission", error);
    }
  };

  const restoreSubmission = async (indicatorId: string, submissionId: string) => {
    try {
      await api.restoreSubmission(submissionId);
      await refreshSubmissions([indicatorId], showDeleted);
    } catch (error) {
      console.error("Failed to restore submission", error);
    }
  };

  const toggleSelectedSubmission = (submissionId: string, checked: boolean) => {
    setSelectedSubmissionIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(submissionId);
      else next.delete(submissionId);
      return next;
    });
  };

  const batchDelete = async () => {
    const ids = Array.from(selectedSubmissionIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Soft-delete ${ids.length} submission(s)?`)) return;
    await Promise.all(ids.map((id) => api.deleteSubmission(id).catch(() => null)));
    setSelectedSubmissionIds(new Set());
    await refreshSubmissions(indicators.map((ind) => ind.id), showDeleted);
  };

  const batchRestore = async () => {
    const ids = Array.from(selectedSubmissionIds);
    if (ids.length === 0) return;
    await Promise.all(ids.map((id) => api.restoreSubmission(id).catch(() => null)));
    setSelectedSubmissionIds(new Set());
    await refreshSubmissions(indicators.map((ind) => ind.id), showDeleted);
  };

  return (
    <Layout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Data Entry & Verification
        </h1>
        <p className="text-slate-500 mt-1">
          Submit monitoring data and attach verification evidence.
        </p>
      </div>

      {/* Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full md:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search by indicator name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-md border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white text-slate-900"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="text-slate-400 w-4 h-4 hidden md:block" />
          <select
            className="flex-1 md:w-64 px-3 py-2 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-2 text-xs text-slate-600 bg-white border border-slate-300 rounded-md px-3 py-2">
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
            onClick={batchDelete}
            disabled={selectedSubmissionIds.size === 0}
          >
            Delete Selected
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={batchRestore}
            disabled={selectedSubmissionIds.size === 0}
          >
            Restore Selected
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500">
          Loading indicators...
        </div>
      ) : filteredIndicators.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
          <p className="text-slate-500">
            No indicators found matching your criteria.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredIndicators.map((indicator) => {
            const entry = entries[indicator.id] || {
              value: "",
              selectedCategories: [],
              date: "",
              evidence: "",
              file: null,
              status: "idle",
            };
            const lastSubmission =
              indicator.values[indicator.values.length - 1];
            const lastValue = lastSubmission
              ? formatCategoricalDisplay(
                  lastSubmission.value,
                  lastSubmission.categoryValue ?? undefined,
                  indicator,
                )
              : "N/A";

            return (
              <div
                key={indicator.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group hover:shadow-md transition-shadow"
              >
                {/* Header */}
                <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        to={`/projects/${indicator.projectId}`}
                        className="text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-blue-600 hover:underline"
                      >
                        {getProjectName(indicator.projectId)}
                      </Link>
                      <span className="text-slate-300">•</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">
                        {indicator.type}
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

                {/* Data Entry Form */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    {/* Date */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> Reporting Date
                      </label>
                      <input
                        type="date"
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                        value={entry.date}
                        onChange={(e) =>
                          handleEntryChange(
                            indicator.id,
                            "date",
                            e.target.value,
                          )
                        }
                      />
                    </div>

                    {/* Value input */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                        Value ({indicator.unit || "Count"})
                      </label>

                      <input
                        type={getInputType(indicator.type)}
                        placeholder="0.00"
                        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                        value={entry.value}
                        onChange={(e) =>
                          handleEntryChange(
                            indicator.id,
                            "value",
                            e.target.value,
                          )
                        }
                      />

                      {entry.error && (
                        <p className="text-xs text-red-600 mt-1">
                          {entry.error}
                        </p>
                      )}
                    </div>

                    {/* Category Selection */}
                    {indicator.categories &&
                      indicator.categories.length > 0 && (
                        <div className="md:col-span-3">
                          <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                            Category{" "}
                            {indicator.categoryConfig?.required && (
                              <span className="text-red-500">*</span>
                            )}
                          </label>
                          <div className="space-y-1.5 max-h-32 overflow-y-auto border border-slate-200 rounded-lg p-2 bg-slate-50">
                            {indicator.categories.map(
                              (cat: CategoryDefinition) => {
                                const isChecked = (
                                  entry.selectedCategories || []
                                ).includes(cat.id);
                                const allowMultiple =
                                  indicator.categoryConfig?.allowMultiple ??
                                  false;

                                return (
                                  <label
                                    key={cat.id}
                                    className="flex items-center p-1.5 border border-slate-300 rounded cursor-pointer hover:bg-white transition-colors"
                                    style={{
                                      borderColor: isChecked
                                        ? cat.color
                                        : undefined,
                                      backgroundColor: isChecked
                                        ? `${cat.color}15`
                                        : undefined,
                                    }}
                                  >
                                    <input
                                      type={
                                        allowMultiple ? "checkbox" : "radio"
                                      }
                                      name={`category-${indicator.id}`}
                                      checked={isChecked}
                                      onChange={() =>
                                        handleCategoryToggle(
                                          indicator.id,
                                          cat.id,
                                          allowMultiple,
                                        )
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
                              },
                            )}
                          </div>
                        </div>
                      )}

                    {/* Verification Evidence (Drag & Drop) */}
                    <div className="md:col-span-6">
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                          <LinkIcon className="w-3 h-3" /> Verification Source
                        </label>
                        <div className="flex items-center gap-2">
                          {parsingPdfId === indicator.id ? (
                            <span className="text-xs text-blue-500 animate-pulse flex items-center gap-1">
                              Parsing...
                            </span>
                          ) : (
                            <label className="cursor-pointer flex items-center gap-1 text-[10px] uppercase font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2 py-0.5 rounded transition-colors">
                              <FileBox className="w-3 h-3" />
                              Auto-Fill from PDF
                              <input
                                type="file"
                                accept=".pdf"
                                className="hidden"
                                onChange={(e) =>
                                  e.target.files?.[0] &&
                                  handleAutoFillPdf(indicator.id, e.target.files[0])
                                }
                              />
                            </label>
                          )}
                        </div>
                      </div>

                      {entry.file ? (
                        <div className="w-full px-3 py-2.5 border border-blue-200 bg-blue-50 rounded-lg flex items-center justify-between animate-in fade-in">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="bg-blue-100 p-1 rounded text-blue-600">
                              <FileText className="w-4 h-4" />
                            </div>
                            <span className="text-sm text-blue-900 truncate font-medium">
                              {entry.file.name}
                            </span>
                            <span className="text-xs text-blue-500 whitespace-nowrap">
                              ({(entry.file.size / 1024).toFixed(0)} KB)
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveFile(indicator.id)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded-full hover:bg-white transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          className={`relative group transition-all duration-200 rounded-lg border-2 ${
                            draggingId === indicator.id
                              ? "border-blue-500 bg-blue-50"
                              : "border-slate-300 border-dashed bg-white hover:border-slate-400"
                          }`}
                          onDragOver={(e) => handleDragOver(e, indicator.id)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, indicator.id)}
                        >
                          <input
                            type="text"
                            placeholder={
                              draggingId === indicator.id
                                ? "Drop file now..."
                                : "Paste link or drag file here"
                            }
                            className={`w-full px-3 py-2.5 bg-transparent text-sm focus:outline-none pl-9 rounded-lg z-10 relative ${
                              draggingId === indicator.id
                                ? "pointer-events-none"
                                : ""
                            }`}
                            value={entry.evidence}
                            onChange={(e) =>
                              handleEntryChange(
                                indicator.id,
                                "evidence",
                                e.target.value,
                              )
                            }
                          />

                          <LinkIcon
                            className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
                              draggingId === indicator.id
                                ? "text-blue-500"
                                : "text-slate-400"
                            }`}
                          />

                          {!entry.evidence && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                              <label
                                className="cursor-pointer p-1.5 rounded-md text-slate-400 hover:text-blue-600 hover:bg-slate-100 block transition-colors"
                                title="Upload File"
                              >
                                <UploadCloud className="w-4 h-4" />
                                <input
                                  type="file"
                                  className="hidden"
                                  onChange={(e) =>
                                    e.target.files?.[0] &&
                                    handleFileSelect(
                                      indicator.id,
                                      e.target.files[0],
                                    )
                                  }
                                />
                              </label>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <div className="md:col-span-2">
                      <Button
                        className={`w-full h-[42px] justify-center transition-all duration-300 ${
                          entry.status === "saved"
                            ? "bg-green-600 hover:bg-green-700"
                            : ""
                        }`}
                        disabled={
                          !entry.value ||
                          (indicator.categoryConfig?.required === true &&
                            indicator.categories &&
                            indicator.categories.length > 0 &&
                            (entry.selectedCategories || []).length === 0) ||
                          entry.status === "saving" ||
                          entry.status === "saved"
                        }
                        onClick={() => handleSubmit(indicator.id)}
                      >
                        {entry.status === "saving" ? (
                          "Saving..."
                        ) : entry.status === "saved" ? (
                          <>
                            <Check className="w-4 h-4 mr-1.5" /> Saved
                          </>
                        ) : (
                          "Submit"
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Info / Hints */}
                  {(indicator.minExpected !== undefined ||
                    indicator.maxExpected !== undefined) && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                      <AlertCircle className="w-3 h-3" />
                      <span>
                        Expected Range: {indicator.minExpected ?? 0} -{" "}
                        {indicator.maxExpected ?? "∞"}
                      </span>
                    </div>
                  )}

                  <div className="mt-4 border-t border-slate-100 pt-4">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      Recent Submissions
                    </h4>
                    <div className="space-y-2">
                      {(submissionsByIndicator[indicator.id] || [])
                        .slice(0, 5)
                        .map((row) => {
                          const edit = editingSubmissionRows[row.id];
                          const editable = canModifySubmission(row);
                          return (
                            <div
                              key={row.id}
                              className={`grid grid-cols-12 gap-2 items-center text-xs p-2 rounded border ${
                                row.deletedAt
                                  ? "bg-amber-50 border-amber-200"
                                  : "bg-slate-50 border-slate-200"
                              }`}
                            >
                              <div className="col-span-1">
                                <input
                                  type="checkbox"
                                  checked={selectedSubmissionIds.has(row.id)}
                                  onChange={(e) =>
                                    toggleSelectedSubmission(
                                      row.id,
                                      e.target.checked,
                                    )
                                  }
                                />
                              </div>
                              <div className="col-span-2 text-slate-600">
                                {edit ? (
                                  <input
                                    type="date"
                                    value={edit.reportedAt}
                                    onChange={(e) =>
                                      setEditingSubmissionRows((prev) => ({
                                        ...prev,
                                        [row.id]: {
                                          ...prev[row.id],
                                          reportedAt: e.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full px-1 py-1 border border-slate-300 rounded bg-white"
                                  />
                                ) : (
                                  new Date(row.date).toLocaleDateString("en-US")
                                )}
                              </div>
                              <div className="col-span-2 text-slate-900 font-semibold">
                                {edit ? (
                                  <input
                                    type="text"
                                    value={edit.value}
                                    onChange={(e) =>
                                      setEditingSubmissionRows((prev) => ({
                                        ...prev,
                                        [row.id]: {
                                          ...prev[row.id],
                                          value: e.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full px-1 py-1 border border-slate-300 rounded bg-white"
                                  />
                                ) : (
                                  String(row.value)
                                )}
                              </div>
                              <div className="col-span-3 text-slate-500 truncate">
                                {edit ? (
                                  <input
                                    type="text"
                                    value={edit.evidence}
                                    onChange={(e) =>
                                      setEditingSubmissionRows((prev) => ({
                                        ...prev,
                                        [row.id]: {
                                          ...prev[row.id],
                                          evidence: e.target.value,
                                        },
                                      }))
                                    }
                                    className="w-full px-1 py-1 border border-slate-300 rounded bg-white"
                                  />
                                ) : (
                                  row.evidence || "-"
                                )}
                              </div>
                              <div className="col-span-4 flex justify-end gap-1">
                                {edit ? (
                                  <>
                                    <button
                                      className="px-2 py-1 rounded border border-green-300 text-green-700 bg-green-50"
                                      onClick={() => saveEditedSubmission(row.id)}
                                    >
                                      Save
                                    </button>
                                    <button
                                      className="px-2 py-1 rounded border border-slate-300 text-slate-700 bg-white"
                                      onClick={() => cancelEditSubmission(row.id)}
                                    >
                                      Cancel
                                    </button>
                                  </>
                                ) : row.deletedAt ? (
                                  <button
                                    className="px-2 py-1 rounded border border-amber-300 text-amber-700 bg-white"
                                    onClick={() =>
                                      restoreSubmission(indicator.id, row.id)
                                    }
                                  >
                                    Restore
                                  </button>
                                ) : (
                                  <>
                                    <button
                                      className="px-2 py-1 rounded border border-blue-300 text-blue-700 bg-white disabled:opacity-40"
                                      disabled={!editable}
                                      onClick={() =>
                                        beginEditSubmission(indicator.id, row)
                                      }
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className="px-2 py-1 rounded border border-red-300 text-red-700 bg-white disabled:opacity-40"
                                      disabled={!editable}
                                      onClick={() =>
                                        softDeleteSubmission(indicator.id, row.id)
                                      }
                                    >
                                      Delete
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      {(submissionsByIndicator[indicator.id] || []).length ===
                        0 && (
                        <p className="text-xs text-slate-400 italic">
                          No submissions yet.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Layout>
  );
};
