import React from "react";

interface ImportPreviewTableProps {
  preview: any[];
  previewHasCategory: boolean;
  previewHasDisaggregation: boolean;
  previewHasEvidence: boolean;
  selectedRows: number[];
  onRowSelect: (idx: number) => void;
  allSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}

export const ImportPreviewTable: React.FC<ImportPreviewTableProps> = ({
  preview,
  previewHasCategory,
  previewHasDisaggregation,
  previewHasEvidence,
  selectedRows,
  onRowSelect,
  allSelected,
  onSelectAll,
  onDeselectAll,
}) => {
  const isRowSelectable = (row: any) =>
    row.valid || (row.warnings && row.warnings.length > 0);
  const isRowSelected = (idx: number) => selectedRows.includes(idx);

  return (
    <div>
      <h3 className="font-medium text-gray-900 mb-3">Preview (first 10 rows)</h3>
      <div className="overflow-x-auto max-h-64 border border-gray-300 rounded-lg shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-2 py-2 text-left">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={allSelected ? onDeselectAll : onSelectAll}
                  aria-label={allSelected ? "Deselect all" : "Select all"}
                />
              </th>
              <th className="px-3 py-2 text-left">Row</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-left">Value</th>
              {previewHasCategory && (
                <th className="px-3 py-2 text-left">Category</th>
              )}
              {previewHasDisaggregation && (
                <th className="px-3 py-2 text-left">Disaggregation</th>
              )}
              {previewHasEvidence && (
                <th className="px-3 py-2 text-left">Evidence</th>
              )}
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Issues</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((row, idx) => {
              const selectable = isRowSelectable(row);
              const selected = isRowSelected(idx);
              return (
                <tr
                  key={idx}
                  className={
                    !selectable
                      ? "bg-red-50 opacity-60"
                      : !selected
                        ? "bg-gray-50 opacity-70"
                        : ""
                  }
                >
                  <td className="px-2 py-2 border-t">
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={!selectable}
                      onChange={() => onRowSelect(idx)}
                      aria-label={
                        selectable
                          ? selected
                            ? "Deselect row"
                            : "Select row"
                          : "Row not selectable"
                      }
                    />
                  </td>
                  <td className="px-3 py-2 border-t">{row.rowNumber}</td>
                  <td className="px-3 py-2 border-t">
                    {row.data?.reportedAt || "-"}
                  </td>
                  <td className="px-3 py-2 border-t">{row.data?.value || "-"}</td>
                  {previewHasCategory && (
                    <td className="px-3 py-2 border-t">
                      {row.data?.categoryValue || "-"}
                    </td>
                  )}
                  {previewHasDisaggregation && (
                    <td className="px-3 py-2 border-t">
                      {row.data?.disaggregationKey || "-"}
                    </td>
                  )}
                  {previewHasEvidence && (
                    <td className="px-3 py-2 border-t">
                      {row.data?.evidence || "-"}
                    </td>
                  )}
                  <td className="px-3 py-2 border-t">
                    {row.valid ? (
                      (row.warnings?.length || 0) > 0 ? (
                        <span className="text-amber-600">⚠ Warning</span>
                      ) : (
                        <span className="text-green-600">✓ Valid</span>
                      )
                    ) : (
                      <span className="text-red-600">✗ Invalid</span>
                    )}
                  </td>
                  <td className="px-3 py-2 border-t max-w-xs">
                    {row.valid && (!row.warnings || row.warnings.length === 0) ? (
                      <span className="text-slate-400">-</span>
                    ) : (
                      <div className="space-y-1">
                        {[...(row.errors || []), ...(row.warnings || [])]
                          .slice(0, 2)
                          .map((issue: any, issueIdx: number) => (
                            <p
                              key={issueIdx}
                              className={
                                issue.severity === "warning"
                                  ? "text-amber-700 text-xs"
                                  : "text-red-700 text-xs"
                              }
                            >
                              {issue.field}: {issue.message}
                            </p>
                          ))}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
