import React from "react";
import { Button } from "../ui/Button";
import { ImportPreviewTable } from "./ImportPreviewTable";

interface ValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warnings: number;
}

interface ImportValidationStepProps {
  validationSummary: ValidationSummary;
  preview: any[];
  selectedRows: number[];
  onRowSelect: (idx: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export const ImportValidationStep: React.FC<ImportValidationStepProps> = ({
  validationSummary,
  preview,
  selectedRows,
  onRowSelect,
  onSelectAll,
  onDeselectAll,
}) => {
  const isRowSelectable = (row: any) =>
    row.valid || (row.warnings && row.warnings.length > 0);
  const allSelectableCount = preview.filter(isRowSelectable).length;
  const allSelected =
    selectedRows.length === allSelectableCount && allSelectableCount > 0;

  const previewHasCategory = preview.some((row) =>
    String(row?.data?.categoryValue || "").trim(),
  );
  const previewHasDisaggregation = preview.some((row) =>
    String(row?.data?.disaggregationKey || "").trim(),
  );
  const previewHasEvidence = preview.some((row) =>
    String(row?.data?.evidence || "").trim(),
  );

  return (
    <div className="space-y-5">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-3">Validation Summary</h3>
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

      <div className="flex items-center justify-between mt-2 mb-2 bg-slate-50 border border-slate-200 rounded-lg p-3">
        <div className="text-sm">
          <span className="font-medium">Selected rows:</span> {selectedRows.length} /{" "}
          {allSelectableCount}
          {selectedRows.length > 0 && (
            <>
              {(() => {
                const warningCount = selectedRows.filter(
                  (idx) => preview[idx]?.warnings?.length > 0 && preview[idx].valid,
                ).length;
                return warningCount > 0 ? (
                  <span className="ml-3 text-amber-700">
                    ⚠ {warningCount} with warnings
                  </span>
                ) : null;
              })()}
            </>
          )}
        </div>
        <div className="space-x-2">
          <Button
            size="sm"
            variant="outline"
            onClick={onSelectAll}
            disabled={allSelected}
          >
            Select All
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDeselectAll}
            disabled={selectedRows.length === 0}
          >
            Deselect All
          </Button>
        </div>
      </div>

      {preview.length > 0 && (
        <ImportPreviewTable
          preview={preview}
          previewHasCategory={previewHasCategory}
          previewHasDisaggregation={previewHasDisaggregation}
          previewHasEvidence={previewHasEvidence}
          selectedRows={selectedRows}
          onRowSelect={onRowSelect}
          allSelected={allSelected}
          onSelectAll={onSelectAll}
          onDeselectAll={onDeselectAll}
        />
      )}

      {validationSummary.invalidRows > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
          <p className="font-semibold">
            Warning: {validationSummary.invalidRows} rows have errors
          </p>
          <p className="text-sm mt-2">
            Only valid rows will be imported. You can download the error report
            after canceling.
          </p>
        </div>
      )}
    </div>
  );
};
