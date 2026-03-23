import React from "react";
import { Indicator } from "../../../types";

interface WizardStepDetailsProps {
  formData: Partial<Indicator>;
  updateField: (field: keyof Indicator, value: any) => void;
}

export const WizardStepDetails: React.FC<WizardStepDetailsProps> = ({
  formData,
  updateField,
}) => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        Indicator Details
      </h2>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Indicator Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={formData.name || ""}
          onChange={(e) => updateField("name", e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
          placeholder="e.g., Percentage of households with improved sanitation"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Short Code (Optional)
        </label>
        <input
          type="text"
          value={formData.code || ""}
          onChange={(e) => updateField("code", e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm bg-white text-slate-900"
          placeholder="e.g., IND-WASH-01"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Description
        </label>
        <textarea
          rows={4}
          value={formData.description || ""}
          onChange={(e) => updateField("description", e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
          placeholder="Provide a clear definition, method of calculation, and purpose."
        />
      </div>
    </div>
  );
};
