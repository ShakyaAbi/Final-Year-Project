import React from "react";

interface ValidationSummary {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warnings: number;
}

interface ImportStatusStepProps {
  status: "processing" | "complete";
  validationSummary: ValidationSummary | null;
}

export const ImportStatusStep: React.FC<ImportStatusStepProps> = ({
  status,
  validationSummary,
}) => {
  if (status === "processing") {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Importing data...</p>
      </div>
    );
  }

  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-green-600 text-3xl font-bold">✓</span>
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">
        Import Complete!
      </h3>
      {validationSummary && (
        <p className="text-gray-600">
          Successfully imported {validationSummary.validRows} records
        </p>
      )}
    </div>
  );
};
