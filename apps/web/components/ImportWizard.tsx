import React, { useState, useEffect } from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { api } from "../services/api";
import { TemplateManager } from "./TemplateManager";

interface ImportWizardProps {
  indicatorId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "upload" | "validate" | "confirm" | "processing" | "complete";

interface ValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warnings: number;
}

interface Template {
  id: number;
  name: string;
  description?: string;
  columnMappings: Record<string, string>;
  isDefault: boolean;
}

export const ImportWizard: React.FC<ImportWizardProps> = ({
  indicatorId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [jobId, setJobId] = useState<number | null>(null);
  const [validationSummary, setValidationSummary] =
    useState<ValidationSummary | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(
    null,
  );
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
    }
  }, [isOpen, indicatorId]);

  const loadTemplates = async () => {
    try {
      const data = await api.getImportTemplates(indicatorId);
      setTemplates(data);
      // Auto-select default template
      const defaultTemplate = data.find((t: Template) => t.isDefault);
      if (defaultTemplate) {
        setSelectedTemplate(defaultTemplate);
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await api.uploadImportCSV(
        indicatorId,
        file,
        selectedTemplate?.id,
      );
      setJobId(result.jobId);
      setValidationSummary(result.validationSummary);
      setPreview(result.preview || []);
      setStep("validate");
    } catch (err: any) {
      setError(err.message || "Failed to upload file");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      // Call backend to generate sample CSV
      const response = await fetch(
        `http://localhost:4000/api/v1/indicators/${indicatorId}/import-template-sample`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("merlin_token")}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to download template");
      }

      // Download the CSV file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `import-template-indicator-${indicatorId}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error("Failed to download template:", err);
      setError("Failed to download template. Please try again.");
    }
  };

  const handleConfirmImport = async () => {
    if (!jobId) return;

    setLoading(true);
    setError(null);
    setStep("processing");

    try {
      await api.executeImport(jobId);

      // Poll for job completion
      const pollInterval = setInterval(async () => {
        try {
          const status = await api.getImportJobStatus(jobId);

          if (status.status === "COMPLETED") {
            clearInterval(pollInterval);
            setStep("complete");
            setLoading(false);
          } else if (status.status === "FAILED") {
            clearInterval(pollInterval);
            setError("Import failed. Please check the error log.");
            setLoading(false);
          }
        } catch (err) {
          clearInterval(pollInterval);
          setError("Failed to check import status");
          setLoading(false);
        }
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to start import");
      setStep("validate");
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (jobId) {
      try {
        await api.cancelImport(jobId);
      } catch (err) {
        console.error("Failed to cancel import:", err);
      }
    }
    handleClose();
  };

  const handleClose = () => {
    setFile(null);
    setJobId(null);
    setValidationSummary(null);
    setPreview([]);
    setStep("upload");
    setError(null);
    onClose();
  };

  const handleComplete = () => {
    handleClose();
    onSuccess();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={handleCancel}
        title="Import Data from CSV"
      >
        <div className="space-y-5">
          {/* Step indicator */}
          <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div
              className={`flex-1 text-center text-sm ${
                step === "upload"
                  ? "font-semibold text-blue-600"
                  : "text-gray-500"
              }`}
            >
              1. Upload
            </div>
            <div className="w-8 border-t border-gray-300"></div>
            <div
              className={`flex-1 text-center text-sm ${
                step === "validate" || step === "confirm"
                  ? "font-semibold text-blue-600"
                  : "text-gray-500"
              }`}
            >
              2. Validate
            </div>
            <div className="w-8 border-t border-gray-300"></div>
            <div
              className={`flex-1 text-center text-sm ${
                step === "processing" || step === "complete"
                  ? "font-semibold text-blue-600"
                  : "text-gray-500"
              }`}
            >
              3. Import
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Upload step */}
          {step === "upload" && (
            <div className="space-y-5">
              {/* Template selection with improved UI */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-5 h-5 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <label className="block text-sm font-semibold text-gray-900">
                      Import Template
                    </label>
                  </div>
                  <button
                    onClick={() => setShowTemplateManager(true)}
                    className="text-sm text-blue-600 hover:text-blue-800 font-medium hover:underline"
                  >
                    Manage Templates
                  </button>
                </div>
                <select
                  value={selectedTemplate?.id || ""}
                  onChange={(e) => {
                    const template = templates.find(
                      (t) => t.id === Number(e.target.value),
                    );
                    setSelectedTemplate(template || null);
                  }}
                  className="w-full px-4 py-2.5 border border-blue-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
                >
                  <option value="">No template (auto-detect columns)</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name} {template.isDefault ? "✓ Default" : ""}
                    </option>
                  ))}
                </select>
                {selectedTemplate && (
                  <div className="mt-4 space-y-3">
                    {selectedTemplate.description && (
                      <div className="bg-white/60 rounded-md p-3 border border-blue-200">
                        <p className="text-xs text-gray-700 leading-relaxed">
                          <span className="font-medium">Description:</span>{" "}
                          {selectedTemplate.description}
                        </p>
                      </div>
                    )}
                    <div className="bg-white/80 rounded-md p-3 border border-blue-200">
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-blue-700 font-medium mb-2 w-full">
                          📋 Required CSV Columns:
                        </span>
                        {(() => {
                          const mapping = selectedTemplate.columnMappings || {};
                          const columns =
                            typeof mapping.columns !== "undefined"
                              ? (mapping.columns || []).map(
                                  (col: any) => col.csvHeader,
                                )
                              : Object.values(mapping);
                          return columns.map((col: any, idx: number) => (
                            <span
                              key={idx}
                              className="px-2.5 py-1 text-xs bg-white text-blue-800 rounded-md border border-blue-300 font-mono shadow-sm"
                            >
                              {col}
                            </span>
                          ));
                        })()}
                      </div>
                      <p className="text-xs text-gray-600 mt-3 italic">
                        💡 Tip: Download the template below to see the exact
                        format with sample data
                      </p>
                    </div>
                    <button
                      onClick={handleDownloadTemplate}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm text-blue-700 bg-white hover:bg-blue-50 border border-blue-300 rounded-md font-medium transition-colors shadow-sm"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      Download Template CSV
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select CSV File
                </label>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2.5 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-semibold
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  cursor-pointer"
                />
                {file && (
                  <div className="mt-3 text-sm text-gray-600 bg-green-50 border border-green-200 px-3 py-2 rounded-lg">
                    <span className="font-medium">Selected:</span> {file.name} (
                    {(file.size / 1024).toFixed(2)} KB)
                  </div>
                )}
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700">
                <p className="font-medium text-gray-900 mb-2">
                  CSV Format Requirements:
                </p>
                <ul className="list-disc list-inside space-y-1.5 text-gray-600">
                  <li>First row must contain column headers</li>
                  <li>Required columns: Date, Value</li>
                  <li>Date format: YYYY-MM-DD (e.g., 2024-01-15)</li>
                  <li>Maximum file size: 10MB</li>
                </ul>
              </div>
            </div>
          )}

          {/* Validation step */}
          {step === "validate" && validationSummary && (
            <div className="space-y-5">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-3">
                  Validation Summary
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="text-blue-800">Total Rows:</div>
                  <div className="font-semibold text-blue-900">
                    {validationSummary.totalRows}
                  </div>
                  <div className="text-blue-800">Valid Rows:</div>
                  <div className="text-green-600 font-semibold">
                    {validationSummary.validRows}
                  </div>
                  <div className="text-blue-800">Invalid Rows:</div>
                  <div className="text-red-600 font-semibold">
                    {validationSummary.invalidRows}
                  </div>
                  <div className="text-blue-800">Warnings:</div>
                  <div className="text-yellow-600 font-semibold">
                    {validationSummary.warnings}
                  </div>
                </div>
              </div>

              {preview.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-3">
                    Preview (first 10 rows)
                  </h3>
                  <div className="overflow-x-auto max-h-64 border border-gray-300 rounded-lg shadow-sm">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Row</th>
                          <th className="px-3 py-2 text-left">Date</th>
                          <th className="px-3 py-2 text-left">Value</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.map((row, idx) => (
                          <tr
                            key={idx}
                            className={row.valid ? "" : "bg-red-50"}
                          >
                            <td className="px-3 py-2 border-t">
                              {row.rowNumber}
                            </td>
                            <td className="px-3 py-2 border-t">
                              {row.data?.reportedAt || "-"}
                            </td>
                            <td className="px-3 py-2 border-t">
                              {row.data?.value || "-"}
                            </td>
                            <td className="px-3 py-2 border-t">
                              {row.valid ? (
                                <span className="text-green-600">✓ Valid</span>
                              ) : (
                                <span className="text-red-600">✗ Invalid</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {validationSummary.invalidRows > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
                  <p className="font-semibold">
                    ⚠️ Warning: {validationSummary.invalidRows} rows have errors
                  </p>
                  <p className="text-sm mt-2">
                    Only valid rows will be imported. You can download the error
                    report after canceling.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Processing step */}
          {step === "processing" && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Importing data...</p>
            </div>
          )}

          {/* Complete step */}
          {step === "complete" && validationSummary && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 text-3xl font-bold">✓</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Import Complete!
              </h3>
              <p className="text-gray-600">
                Successfully imported {validationSummary.validRows} records
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
            {step === "upload" && (
              <>
                <Button variant="secondary" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={!file || loading}>
                  {loading ? "Uploading..." : "Next"}
                </Button>
              </>
            )}

            {step === "validate" && (
              <>
                <Button variant="secondary" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirmImport}
                  disabled={loading || validationSummary?.validRows === 0}
                >
                  Import {validationSummary?.validRows} Rows
                </Button>
              </>
            )}

            {step === "complete" && (
              <Button onClick={handleComplete}>Done</Button>
            )}
          </div>
        </div>
      </Modal>

      {showTemplateManager && (
        <TemplateManager
          indicatorId={indicatorId}
          type="import"
          isOpen={showTemplateManager}
          onClose={() => {
            setShowTemplateManager(false);
            loadTemplates();
          }}
          onSelectTemplate={(template) => {
            setSelectedTemplate(template);
            setShowTemplateManager(false);
            loadTemplates();
          }}
        />
      )}
    </>
  );
};
