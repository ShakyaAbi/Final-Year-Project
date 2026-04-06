import React, { useState, useEffect } from "react";
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
import { Layout } from "../components/Layout";
import { DataEntryToolbar } from "../components/indicator/DataEntryToolbar";
import { IndicatorEntryCard } from "../components/indicator/IndicatorEntryCard";

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
        disaggregationKey?: string;
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
      const getSuggestedDate = (ind: Indicator) => {
        const today = new Date();
        const maxOffset = ind.frequency === "Daily" ? 7 : 4;
        
        // Find the latest one that is NOT reported
        for (let offset = 0; offset < maxOffset; offset++) {
          let dateStr = "";
          const d = new Date(today);
          if (ind.frequency === "Daily") {
            dateStr = new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset).toISOString().split("T")[0];
          } else if (ind.frequency === "Weekly") {
            const diff = d.getDate() - d.getDay() - (offset * 7);
            dateStr = new Date(d.getFullYear(), d.getMonth(), diff).toISOString().split("T")[0];
          } else if (ind.frequency === "Monthly") {
            dateStr = new Date(d.getFullYear(), d.getMonth() - offset, 0).toISOString().split("T")[0];
          }
          
          const isDone = ind.values.some(v => v.date.startsWith(dateStr));
          if (!isDone) return dateStr;
        }
        
        // Fallback to most recent boundary
        if (ind.frequency === "Weekly") {
          const diff = today.getDate() - today.getDay();
          return new Date(today.getFullYear(), today.getMonth(), diff).toISOString().split("T")[0];
        } else if (ind.frequency === "Monthly") {
          return new Date(today.getFullYear(), today.getMonth(), 0).toISOString().split("T")[0];
        }
        return today.toISOString().split("T")[0];
      };

      indData.forEach((ind) => {
        initialEntries[ind.id] = {
          value: "",
          selectedCategories: [],
          date: getSuggestedDate(ind),
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
    return false;
  };

  const beginEditSubmission = (indicatorId: string, row: IndicatorValue) => {
    setEditingSubmissionRows((prev) => ({
      ...prev,
      [row.id]: {
        indicatorId,
        reportedAt: row.date.slice(0, 10),
        value: String(row.value ?? ""),
        categoryValue: row.categoryValue ?? "",
        disaggregationKey: row.disaggregationKey ?? "",
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
        disaggregationKey: edit.disaggregationKey || undefined,
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

      <DataEntryToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedProject={selectedProject}
        setSelectedProject={setSelectedProject}
        projects={projects}
        showDeleted={showDeleted}
        setShowDeleted={setShowDeleted}
        selectedCount={selectedSubmissionIds.size}
        onBatchDelete={batchDelete}
        onBatchRestore={batchRestore}
      />

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
            const lastSubmission = indicator.values[indicator.values.length - 1];
            const lastValue = lastSubmission
              ? formatCategoricalDisplay(
                  lastSubmission.value,
                  lastSubmission.categoryValue ?? undefined,
                  indicator,
                )
              : "N/A";

            return (
              <IndicatorEntryCard
                key={indicator.id}
                indicator={indicator}
                projectName={getProjectName(indicator.projectId)}
                lastValue={lastValue}
                formatCategoryValue={formatCategoryValue}
                entry={entry}
                handleEntryChange={handleEntryChange}
                handleCategoryToggle={handleCategoryToggle}
                handleFileSelect={handleFileSelect}
                handleRemoveFile={handleRemoveFile}
                handleAutoFillPdf={handleAutoFillPdf}
                handleSubmit={handleSubmit}
                parsingPdfId={parsingPdfId}
                draggingId={draggingId}
                handleDragOver={handleDragOver}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                submissions={submissionsByIndicator[indicator.id] || []}
                selectedSubmissionIds={selectedSubmissionIds}
                toggleSelectedSubmission={toggleSelectedSubmission}
                editingSubmissionRows={editingSubmissionRows}
                setEditingSubmissionRows={setEditingSubmissionRows}
                canModifySubmission={canModifySubmission}
                beginEditSubmission={beginEditSubmission}
                cancelEditSubmission={cancelEditSubmission}
                saveEditedSubmission={saveEditedSubmission}
                softDeleteSubmission={softDeleteSubmission}
                restoreSubmission={restoreSubmission}
              />
            );
          })}
        </div>
      )}
    </Layout>
  );
};
