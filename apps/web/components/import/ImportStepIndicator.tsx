import React from "react";

type Step = "upload" | "validate" | "processing" | "complete";

interface ImportStepIndicatorProps {
  currentStep: Step;
}

export const ImportStepIndicator: React.FC<ImportStepIndicatorProps> = ({
  currentStep,
}) => {
  return (
    <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div
        className={`flex-1 text-center text-sm ${
          currentStep === "upload"
            ? "font-semibold text-blue-600"
            : "text-gray-500"
        }`}
      >
        1. Upload
      </div>
      <div className="w-8 border-t border-gray-300"></div>
      <div
        className={`flex-1 text-center text-sm ${
          currentStep === "validate"
            ? "font-semibold text-blue-600"
            : "text-gray-500"
        }`}
      >
        2. Validate
      </div>
      <div className="w-8 border-t border-gray-300"></div>
      <div
        className={`flex-1 text-center text-sm ${
          currentStep === "processing" || currentStep === "complete"
            ? "font-semibold text-blue-600"
            : "text-gray-500"
        }`}
      >
        3. Import
      </div>
    </div>
  );
};
