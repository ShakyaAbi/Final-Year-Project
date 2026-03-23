import React from "react";

interface Template {
  id: number;
  name: string;
  description?: string;
  columnMapping?: any;
  columnMappings?: any;
  isDefault: boolean;
}

interface ImportTemplateSelectorProps {
  templates: Template[];
  selectedTemplate: Template | null;
  onSelect: (template: Template | null) => void;
  onDownloadSample: () => void;
  onManageTemplates: () => void;
  isDownloading: boolean;
}

export const ImportTemplateSelector: React.FC<ImportTemplateSelectorProps> = ({
  templates,
  selectedTemplate,
  onSelect,
  onDownloadSample,
  onManageTemplates,
  isDownloading,
}) => {
  const getTemplateColumns = (template: Template | null): string[] => {
    if (!template) return [];
    const mapping = template.columnMapping || template.columnMappings || {};
    if (Array.isArray(mapping.columns)) {
      return mapping.columns
        .map((col: any) => col?.csvHeader)
        .filter((col: string) => !!col);
    }
    if (typeof mapping === "object" && mapping !== null) {
      return Object.values(mapping).filter(Boolean) as string[];
    }
    return [];
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm transition-all hover:shadow-md">
      <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white rounded-lg shadow-sm text-blue-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Import Template</h3>
            <p className="text-[11px] text-slate-500 font-medium">Standardize your data mapping</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={onDownloadSample}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors uppercase tracking-wider"
            disabled={isDownloading}
          >
            {isDownloading ? "..." : "Sample CSV"}
          </button>
          <button
            onClick={onManageTemplates}
            className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors uppercase tracking-wider"
          >
            Manage
          </button>
        </div>
      </div>
      
      <div className="p-6 space-y-4">
        <div className="relative group">
          <select
            value={selectedTemplate?.id || ""}
            onChange={(e) => {
              const template = templates.find(
                (t) => t.id === Number(e.target.value),
              );
              onSelect(template || null);
            }}
            className="w-full pl-4 pr-10 py-3 appearance-none bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer text-slate-700"
          >
            <option value="">Use default mapping</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} {template.isDefault ? " (Default)" : ""}
              </option>
            ))}
          </select>
          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {selectedTemplate && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            {selectedTemplate.description && (
              <p className="text-xs text-slate-500 mb-4 pl-1 leading-relaxed italic">
                {selectedTemplate.description}
              </p>
            )}
            <div className="bg-slate-50/80 border border-slate-100 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1 h-3 bg-blue-500 rounded-full"></span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Required Mapping
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {getTemplateColumns(selectedTemplate).map((col, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 text-[11px] font-bold bg-white text-blue-600 rounded-lg border border-blue-100 shadow-sm"
                  >
                    {col}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 text-[10px] text-slate-400 font-medium italic">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Template includes sample rows for testing formatting
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
