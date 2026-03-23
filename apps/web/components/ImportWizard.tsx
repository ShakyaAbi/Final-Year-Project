import React, { useState, useEffect } from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { api } from "../services/api";
import { TemplateManager } from "./TemplateManager";
import { Indicator } from "../types";
import { ImportStepIndicator } from "./import/ImportStepIndicator";
import { ImportUploadStep } from "./import/ImportUploadStep";
import { ImportValidationStep } from "./import/ImportValidationStep";
import { ImportStatusStep } from "./import/ImportStatusStep";

interface ImportWizardProps {
  indicatorId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "upload" | "validate" | "processing" | "complete";

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
  columnMapping?: any;
  columnMappings?: any;
  isDefault: boolean;
}

export const ImportWizard: React.FC<ImportWizardProps> = ({
  indicatorId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
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
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);
  const [indicator, setIndicator] = useState<Indicator | null>(null);

  // Select all valid/warning rows by default when preview changes
  useEffect(() => {
    if (preview.length > 0) {
      const defaultSelected = preview
        .map((row, idx) =>
          row.valid || (row.warnings && row.warnings.length > 0) ? idx : null,
        )
        .filter((idx) => idx !== null) as number[];
      setSelectedRows(defaultSelected);
    }
  }, [preview]);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      loadIndicator();
    }
  }, [isOpen, indicatorId]);

  const loadTemplates = async () => {
    try {
      const data: Template[] = await api.getImportTemplates(indicatorId);
      setTemplates(data);
      const defaultTemplate = data.find((t) => t.isDefault) || data[0] || null;
      setSelectedTemplate(defaultTemplate);
    } catch (err) {
      console.error("Failed to load templates:", err);
    }
  };

  const loadIndicator = async () => {
    try {
      const data = await api.getIndicator(indicatorId);
      setIndicator(data);
    } catch (err) {
      console.error("Failed to load indicator for import:", err);
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
    setIsDownloadingTemplate(true);
    setError(null);
    try {
      const blob = await api.downloadImportTemplateSample(indicatorId);
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
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!jobId) return;
    setLoading(true);
    setError(null);
    setStep("processing");
    try {
      const selectedRowNumbers = selectedRows
        .map((idx) => preview[idx]?.rowNumber)
        .filter(Boolean);
      await api.executeImport(jobId, selectedRowNumbers);
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

  const isRowSelectable = (row: any) =>
    row.valid || (row.warnings && row.warnings.length > 0);

  const handleSelectAll = () => {
    const selectable = preview
      .map((row, idx) => (isRowSelectable(row) ? idx : null))
      .filter((idx) => idx !== null) as number[];
    setSelectedRows(selectable);
  };

  const handleDeselectAll = () => setSelectedRows([]);

  const handleRowSelect = (idx: number) => {
    setSelectedRows((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
    );
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={handleCancel} title="Import CSV Entries">
        <div className="space-y-5">
          <ImportStepIndicator currentStep={step} />

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {step === "upload" && (
            <ImportUploadStep
              indicator={indicator}
              templates={templates}
              selectedTemplate={selectedTemplate}
              onSelectTemplate={setSelectedTemplate}
              onDownloadTemplate={handleDownloadTemplate}
              onManageTemplates={() => setShowTemplateManager(true)}
              isDownloadingTemplate={isDownloadingTemplate}
              onFileChange={handleFileChange}
              file={file}
            />
          )}

          {step === "validate" && validationSummary && (
            <ImportValidationStep
              validationSummary={validationSummary}
              preview={preview}
              selectedRows={selectedRows}
              onRowSelect={handleRowSelect}
              onSelectAll={handleSelectAll}
              onDeselectAll={handleDeselectAll}
            />
          )}

          {(step === "processing" || step === "complete") && (
            <ImportStatusStep
              status={step}
              validationSummary={validationSummary}
            />
          )}

          <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
            {step === "upload" && (
              <>
                <Button variant="secondary" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button onClick={handleUpload} disabled={!file || loading}>
                  {loading ? "Uploading..." : "Validate CSV"}
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
                  Import {selectedRows.length} Rows
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
