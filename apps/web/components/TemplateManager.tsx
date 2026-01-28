import React, { useState, useEffect } from "react";
import { api } from "../services/api";
import { Button } from "./ui/Button";
import { Modal } from "./ui/Modal";

interface Template {
  id: number;
  name: string;
  description?: string;
  columnMappings: Record<string, string>;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateManagerProps {
  indicatorId: string;
  type: "import" | "export";
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate?: (template: Template) => void;
}

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  indicatorId,
  type,
  isOpen,
  onClose,
  onSelectTemplate,
}) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBuilder, setShowBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data =
        type === "import"
          ? await api.getImportTemplates(indicatorId)
          : await api.getExportTemplates(indicatorId);
      setTemplates(data);
    } catch (error) {
      console.error("Failed to load templates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, [indicatorId, type]);

  const handleDelete = async (templateId: number) => {
    if (!confirm("Are you sure you want to delete this template?")) return;

    try {
      if (type === "import") {
        await api.deleteImportTemplate(templateId);
      } else {
        await api.deleteExportTemplate(templateId);
      }
      loadTemplates();
    } catch (error) {
      console.error("Failed to delete template:", error);
    }
  };

  const handleSetDefault = async (templateId: number) => {
    try {
      // Update the template to set it as default
      const template = templates.find((t) => t.id === templateId);
      if (!template) return;

      const templateData = {
        name: template.name,
        description: template.description,
        columnMappings: template.columnMappings,
        isDefault: true,
      };

      if (type === "import") {
        await api.updateImportTemplate(templateId, templateData);
      } else {
        await api.updateExportTemplate(templateId, templateData);
      }
      loadTemplates();
    } catch (error) {
      console.error("Failed to set default template:", error);
    }
  };

  const handleClone = async (template: Template) => {
    try {
      const clonedData = {
        name: `${template.name} (Copy)`,
        description: template.description,
        columnMappings: template.columnMappings,
        isDefault: false,
      };

      if (type === "import") {
        await api.createImportTemplate(indicatorId, clonedData);
      } else {
        await api.createExportTemplate(indicatorId, clonedData);
      }
      loadTemplates();
    } catch (error) {
      console.error("Failed to clone template:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <Modal
        isOpen={isOpen && !showBuilder}
        onClose={onClose}
        title={`${type === "import" ? "Import" : "Export"} Templates`}
      >
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Manage your CSV {type} templates for consistent data formatting
              </p>
              <Button
                onClick={() => {
                  setEditingTemplate(null);
                  setShowBuilder(true);
                }}
                size="sm"
              >
                + Create Template
              </Button>
            </div>

            {templates.length === 0 ? (
              <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl border-2 border-dashed border-gray-300">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <svg
                    className="w-8 h-8 text-blue-600"
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
                </div>
                <p className="text-lg font-medium text-gray-900 mb-2">
                  No templates yet
                </p>
                <p className="text-sm text-gray-500 max-w-sm mx-auto">
                  Create your first template to standardize CSV {type}{" "}
                  formatting and save time on future data operations
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map((template) => (
                  <div
                    key={template.id}
                    className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">
                            {template.name}
                          </h4>
                          {template.isDefault && (
                            <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              Default
                            </span>
                          )}
                        </div>
                        {template.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {template.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {Object.values(template.columnMappings).map(
                            (col, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded border border-gray-200"
                              >
                                {col}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {onSelectTemplate && (
                          <button
                            onClick={() => onSelectTemplate(template)}
                            className="text-sm text-green-600 hover:text-green-800 font-medium"
                            title="Use this template"
                          >
                            Use
                          </button>
                        )}{" "}
                        {onSelectTemplate && (
                          <button
                            onClick={() => onSelectTemplate(template)}
                            className="px-3 py-1.5 text-sm text-white bg-green-600 hover:bg-green-700 rounded-md font-medium transition-colors"
                            title="Use this template"
                          >
                            Use Template
                          </button>
                        )}{" "}
                        {!template.isDefault && (
                          <button
                            onClick={() => handleSetDefault(template.id)}
                            className="text-sm text-blue-600 hover:text-blue-800"
                            title="Set as default"
                          >
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingTemplate(template);
                            setShowBuilder(true);
                          }}
                          className="text-sm text-gray-600 hover:text-gray-800"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleClone(template)}
                          className="text-sm text-gray-600 hover:text-gray-800"
                        >
                          Clone
                        </button>
                        <button
                          onClick={() => handleDelete(template.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-gray-200">
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {showBuilder && (
        <TemplateBuilderDialog
          indicatorId={indicatorId}
          type={type}
          template={editingTemplate}
          isOpen={showBuilder}
          onClose={() => {
            setShowBuilder(false);
            setEditingTemplate(null);
          }}
          onSave={() => {
            setShowBuilder(false);
            setEditingTemplate(null);
            loadTemplates();
          }}
        />
      )}
    </>
  );
};

interface TemplateBuilderDialogProps {
  indicatorId: string;
  type: "import" | "export";
  template: Template | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const TemplateBuilderDialog: React.FC<TemplateBuilderDialogProps> = ({
  indicatorId,
  type,
  template,
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(template?.name || "");
  const [description, setDescription] = useState(template?.description || "");
  const [isDefault, setIsDefault] = useState(template?.isDefault || false);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>(
    template?.columnMappings || {
      reportedAt: "Date",
      value: "Value",
    },
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldDefinitions = {
    required: [
      {
        key: "reportedAt",
        label: "Reported Date",
        description: "The date when data was reported",
        example: "Date",
      },
      {
        key: "value",
        label: "Value",
        description: "The numeric or text value",
        example: "Value",
      },
    ],
    optional: [
      {
        key: "disaggregationKey",
        label: "Disaggregation Key",
        description: "Category breakdown identifier",
        example: "Category",
      },
      {
        key: "evidence",
        label: "Evidence",
        description: "Supporting documentation or links",
        example: "Evidence URL",
      },
      {
        key: "notes",
        label: "Notes",
        description: "Additional comments or context",
        example: "Notes",
      },
      {
        key: "reviewer",
        label: "Reviewer",
        description: "Person who reviewed this entry",
        example: "Reviewer Name",
      },
      {
        key: "reviewedAt",
        label: "Reviewed Date",
        description: "When the entry was reviewed",
        example: "Review Date",
      },
    ],
  };

  const requiredFields = fieldDefinitions.required;
  const optionalFields = fieldDefinitions.optional;

  const handleAddMapping = (field: string, defaultValue: string) => {
    setColumnMappings((prev) => ({
      ...prev,
      [field]: defaultValue,
    }));
  };

  const handleRemoveMapping = (field: string) => {
    const isRequired = fieldDefinitions.required.some((f) => f.key === field);
    if (isRequired) return;
    const newMappings = { ...columnMappings };
    delete newMappings[field];
    setColumnMappings(newMappings);
  };

  const handleUpdateMapping = (field: string, csvColumn: string) => {
    setColumnMappings((prev) => ({
      ...prev,
      [field]: csvColumn,
    }));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Template name is required");
      return;
    }

    // Validate required fields
    for (const field of requiredFields) {
      if (!columnMappings[field.key] || !columnMappings[field.key].trim()) {
        setError(
          `Required field "${field.label}" must have a CSV column mapping`,
        );
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const templateData = {
        name: name.trim(),
        description: description.trim() || undefined,
        isDefault,
        columnMappings,
      };

      if (template) {
        // Update existing template
        if (type === "import") {
          await api.updateImportTemplate(template.id, templateData);
        } else {
          await api.updateExportTemplate(template.id, templateData);
        }
      } else {
        // Create new template
        if (type === "import") {
          await api.createImportTemplate(indicatorId, templateData);
        } else {
          await api.createExportTemplate(indicatorId, templateData);
        }
      }

      onSave();
    } catch (err: any) {
      setError(err.message || "Failed to save template");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${template ? "Edit" : "Create"} ${type === "import" ? "Import" : "Export"} Template`}
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Basic Info */}
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Template Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Monthly Report Template"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-900 mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this template and when to use it..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
            />
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 transition-colors"
              />
              <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                Set as default template
              </span>
            </label>
          </div>
        </div>

        {/* Column Mappings */}
        <div className="space-y-4">
          <div className="border-b border-gray-200 pb-3">
            <h3 className="text-base font-semibold text-gray-900">
              Column Mappings
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              Map database fields to your CSV column names
            </p>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-lg border border-gray-200 p-5 space-y-5">
            {/* Required fields */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h4 className="text-sm font-semibold text-gray-900">
                  Required Fields
                </h4>
                <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                  Must be mapped
                </span>
              </div>
              <div className="space-y-3">
                {requiredFields.map((field) => (
                  <div
                    key={field.key}
                    className="bg-white rounded-lg border border-gray-200 p-3.5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-900">
                            {field.label}
                          </span>
                          <span className="text-red-500 text-sm">*</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {field.description}
                        </p>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={columnMappings[field.key] || ""}
                      onChange={(e) =>
                        handleUpdateMapping(field.key, e.target.value)
                      }
                      placeholder={`e.g., "${field.example}"`}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Optional fields */}
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-4">
                <h4 className="text-sm font-semibold text-gray-900">
                  Optional Fields
                </h4>
                <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded-full border border-gray-200">
                  Add as needed
                </span>
              </div>
              <div className="space-y-3">
                {optionalFields.map((field) =>
                  columnMappings[field.key] !== undefined ? (
                    <div
                      key={field.key}
                      className="bg-white rounded-lg border border-gray-200 p-3.5 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-gray-900">
                              {field.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {field.description}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveMapping(field.key)}
                          className="ml-3 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors"
                          title="Remove this field"
                        >
                          Remove
                        </button>
                      </div>
                      <input
                        type="text"
                        value={columnMappings[field.key] || ""}
                        onChange={(e) =>
                          handleUpdateMapping(field.key, e.target.value)
                        }
                        placeholder={`e.g., "${field.example}"`}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  ) : null,
                )}

                {/* Add field buttons */}
                {optionalFields.some(
                  (field) => columnMappings[field.key] === undefined,
                ) && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {optionalFields.map((field) =>
                      columnMappings[field.key] === undefined ? (
                        <button
                          key={field.key}
                          onClick={() =>
                            handleAddMapping(field.key, field.example)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-md transition-colors"
                          title={field.description}
                        >
                          <span className="text-base leading-none">+</span>
                          {field.label}
                        </button>
                      ) : null,
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <svg
              className="w-4 h-4 text-blue-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
              />
            </svg>
            <h4 className="text-sm font-semibold text-blue-900">
              CSV Header Preview
            </h4>
          </div>
          <div className="bg-white rounded-md border border-blue-200 p-3 shadow-inner">
            <div className="text-sm font-mono text-gray-800 overflow-x-auto whitespace-nowrap">
              {Object.values(columnMappings)
                .filter((v) => v)
                .join(", ") || "<No columns mapped yet>"}
            </div>
          </div>
          <p className="text-xs text-blue-700 mt-2">
            This is how your CSV header row will appear
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <svg
                  className="animate-spin h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Saving...
              </span>
            ) : template ? (
              "Update Template"
            ) : (
              "Create Template"
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
