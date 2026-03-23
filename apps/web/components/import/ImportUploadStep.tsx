import React from "react";
import { Indicator, IndicatorType } from "../../types";
import { ImportTemplateSelector } from "./ImportTemplateSelector";

interface Template {
  id: number;
  name: string;
  description?: string;
  columnMapping?: any;
  columnMappings?: any;
  isDefault: boolean;
}

interface ImportUploadStepProps {
  indicator: Indicator | null;
  templates: Template[];
  selectedTemplate: Template | null;
  onSelectTemplate: (template: Template | null) => void;
  onDownloadTemplate: () => void;
  onManageTemplates: () => void;
  isDownloadingTemplate: boolean;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  file: File | null;
}

export const ImportUploadStep: React.FC<ImportUploadStepProps> = ({
  indicator,
  templates,
  selectedTemplate,
  onSelectTemplate,
  onDownloadTemplate,
  onManageTemplates,
  isDownloadingTemplate,
  onFileChange,
  file,
}) => {
  const primaryDisaggregation =
    indicator?.categoryConfig?.disaggregationDimensions?.find((d) => d.required) ||
    indicator?.categoryConfig?.disaggregationDimensions?.[0];

  return (
    <div className="space-y-5">
      <ImportTemplateSelector
        templates={templates}
        selectedTemplate={selectedTemplate}
        onSelect={onSelectTemplate}
        onDownloadSample={onDownloadTemplate}
        onManageTemplates={onManageTemplates}
        isDownloading={isDownloadingTemplate}
      />

      {indicator && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Import Target</p>
              <p className="text-xs text-slate-500">Mapping data to this indicator</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-lg bg-blue-50 text-blue-700 text-[11px] font-bold uppercase tracking-wider border border-blue-100">
              {indicator.type}
            </span>
            {indicator.type === IndicatorType.CATEGORICAL && (
              <span className="px-3 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-bold uppercase tracking-wider border border-emerald-100">
                Categorical mapping
              </span>
            )}
            {primaryDisaggregation && (
              <span className="px-3 py-1 rounded-lg bg-amber-50 text-amber-700 text-[11px] font-bold uppercase tracking-wider border border-amber-100">
                {primaryDisaggregation.label} {primaryDisaggregation.required ? "(Required)" : ""}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="relative group">
        <label className="block text-sm font-bold text-slate-900 mb-3">
          Select CSV File
        </label>
        <div className={`
          relative border-2 border-dashed rounded-2xl p-8 transition-all duration-200
          ${file 
            ? 'border-emerald-200 bg-emerald-50/30' 
            : 'border-slate-200 bg-slate-50/50 hover:border-blue-300 hover:bg-blue-50/30'}
        `}>
          <input
            type="file"
            accept=".csv,.txt"
            onChange={onFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="flex flex-col items-center justify-center text-center">
            <div className={`p-4 rounded-full mb-4 transition-colors ${file ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
              {file ? (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
            </div>
            {file ? (
              <div>
                <p className="text-sm font-bold text-slate-900 mb-1">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(2)} KB • Ready to validate</p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-bold text-slate-900 mb-1">Click or drag CSV here</p>
                <p className="text-xs text-slate-500">Maximum file size: 10MB</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1 bg-white/10 rounded-md">
              <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-bold uppercase tracking-wider text-slate-400">
              Requirements
            </p>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            {[
              "First row must contain headers",
              "Use downloaded template",
              "Date: YYYY-MM-DD",
              indicator?.type === IndicatorType.CATEGORICAL ? "Valid category values" : "Valid numeric values",
              primaryDisaggregation ? `${primaryDisaggregation.label} must match` : "No special mapping",
              "Maximum file size: 10MB"
            ].map((req, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                <span className="text-blue-400 font-bold">•</span>
                {req}
              </li>
            ))}
          </ul>
        </div>
    </div>
  );
};
