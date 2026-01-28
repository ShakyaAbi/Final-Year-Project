import React, { useState, useEffect } from "react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { api } from "../services/api";
import { TemplateManager } from "./TemplateManager";

interface ExportDialogProps {
  indicatorId: string;
  isOpen: boolean;
  onClose: () => void;
  categories?: Array<{ id: string; label: string }>;
}

interface Template {
  id: number;
  name: string;
  description?: string;
  columnMappings: Record<string, string>;
  isDefault: boolean;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  indicatorId,
  isOpen,
  onClose,
  categories = [],
}) => {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [includeAnomalies, setIncludeAnomalies] = useState(true);
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
      const data = await api.getExportTemplates(indicatorId);
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

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  };

  const handleExport = async () => {
    setLoading(true);
    setError(null);

    try {
      const filters: any = {};

      if (dateFrom) filters.dateFrom = dateFrom;
      if (dateTo) filters.dateTo = dateTo;
      if (selectedCategories.length > 0)
        filters.categories = selectedCategories;
      if (!includeAnomalies) filters.excludeAnomalies = true;
      if (selectedTemplate) filters.templateId = selectedTemplate.id;

      const blob = await api.exportIndicatorCSV(indicatorId, filters);

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const templateName =
        selectedTemplate?.name.replace(/\s+/g, "_") || "export";
      a.download = `${templateName}_${indicatorId}_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to export data");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDateFrom("");
    setDateTo("");
    setSelectedCategories([]);
    setIncludeAnomalies(true);
    // Reset to default template
    const defaultTemplate = templates.find((t: Template) => t.isDefault);
    setSelectedTemplate(defaultTemplate || null);
    setError(null);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Export Data to CSV">
        <div className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Template selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Export Template
              </label>
              <button
                onClick={() => setShowTemplateManager(true)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
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
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            >
              <option value="">Standard export (all fields)</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} {template.isDefault ? "(Default)" : ""}
                </option>
              ))}
            </select>
            {selectedTemplate?.description && (
              <p className="text-xs text-gray-600 mt-2 ml-1">
                {selectedTemplate.description}
              </p>
            )}
          </div>

          {/* Date range filters */}
          <div>
            <h3 className="font-medium text-sm text-gray-900 mb-3">
              Date Range
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-2">From</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-2">To</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Category filters */}
          {categories.length > 0 && (
            <div>
              <h3 className="font-medium text-sm text-gray-900 mb-3">
                Categories
              </h3>
              <div className="space-y-2.5 max-h-40 overflow-y-auto bg-gray-50 border border-gray-200 rounded-lg p-3">
                {categories.map((cat) => (
                  <label
                    key={cat.id}
                    className="flex items-center gap-2.5 cursor-pointer hover:bg-white p-2 rounded transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat.id)}
                      onChange={() => handleCategoryToggle(cat.id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{cat.label}</span>
                  </label>
                ))}
              </div>
              {selectedCategories.length > 0 && (
                <button
                  onClick={() => setSelectedCategories([])}
                  className="text-xs text-blue-600 hover:underline mt-2 ml-1"
                >
                  Clear all
                </button>
              )}
            </div>
          )}

          {/* Anomaly filter */}
          <div>
            <h3 className="font-medium text-sm text-gray-900 mb-3">Options</h3>
            <label className="flex items-center gap-2.5 cursor-pointer hover:bg-gray-50 p-3 rounded-lg border border-gray-200 transition-colors">
              <input
                type="checkbox"
                checked={includeAnomalies}
                onChange={(e) => setIncludeAnomalies(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Include anomalies</span>
            </label>
          </div>

          {/* Export info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-semibold mb-2">Export Format</p>
            <ul className="list-disc list-inside space-y-1.5 text-blue-700">
              <li>CSV format with headers</li>
              <li>Date format: YYYY-MM-DD</li>
              <li>All numeric values preserved</li>
              <li>Evidence and notes included</li>
            </ul>
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-3 pt-5 border-t border-gray-200">
            <Button
              variant="secondary"
              onClick={handleReset}
              disabled={loading}
            >
              Reset
            </Button>
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={loading}>
              {loading ? "Exporting..." : "Export CSV"}
            </Button>
          </div>
        </div>
      </Modal>

      {showTemplateManager && (
        <TemplateManager
          indicatorId={indicatorId}
          type="export"
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
