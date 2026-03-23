import React from "react";
import { Indicator } from "../../../types";
import { Calendar } from "lucide-react";

interface WizardStepFrequencyProps {
  formData: Partial<Indicator>;
  updateField: (field: keyof Indicator, value: any) => void;
}

export const WizardStepFrequency: React.FC<WizardStepFrequencyProps> = ({
  formData,
  updateField,
}) => {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        Frequency & Period
      </h2>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Reporting Frequency
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              value: "Daily",
              subtitle: "Data entry expected every day",
            },
            {
              value: "Weekly",
              subtitle: "Data entry expected every week",
            },
            {
              value: "Monthly",
              subtitle: "Data entry expected every month",
            },
          ].map((item) => (
            <button
              type="button"
              key={item.value}
              onClick={() => updateField("frequency", item.value)}
              className={`flex items-center p-3 border rounded-md text-left transition-colors ${
                formData.frequency === item.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-slate-300 bg-white hover:border-blue-300"
              }`}
            >
              <Calendar className="w-5 h-5 text-blue-600 mr-3" />
              <div>
                <span className="font-bold text-slate-900 block">
                  {item.value}
                </span>
                <span className="text-xs text-slate-600">
                  {item.subtitle}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="border border-blue-200 bg-blue-50 rounded-lg p-4 mt-4">
        <div className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={!!formData.reminderEnabled}
            onChange={e => updateField("reminderEnabled", e.target.checked)}
            className="rounded border-blue-400"
            id="reminderEnabled"
          />
          <label htmlFor="reminderEnabled" className="text-sm font-medium text-blue-900">
            Enable Data Entry Reminders
          </label>
        </div>
        {formData.reminderEnabled && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
            <div>
              <label className="block text-xs font-medium text-blue-700 mb-1">
                Days Before Due
              </label>
              <input
                type="number"
                min={0}
                value={formData.reminderDaysBeforeDue ?? 3}
                onChange={e => updateField("reminderDaysBeforeDue", parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-blue-300 rounded-md bg-white text-blue-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-700 mb-1">
                Days After Due
              </label>
              <input
                type="number"
                min={0}
                value={formData.reminderDaysAfterDue ?? 2}
                onChange={e => updateField("reminderDaysAfterDue", parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 border border-blue-300 rounded-md bg-white text-blue-900 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-blue-700 mb-1">
                Recipients (emails)
              </label>
              <input
                type="text"
                value={(formData.reminderRecipients || []).join(", ")}
                onChange={e => updateField("reminderRecipients", e.target.value.split(",").map(s => s.trim()).filter(Boolean))}
                className="w-full px-3 py-2 border border-blue-300 rounded-md bg-white text-blue-900 text-sm"
                placeholder="user1@email.com"
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Start Date (First Submission)
        </label>
        <input
          type="date"
          className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white text-slate-900"
          defaultValue={new Date().toISOString().split("T")[0]}
        />
      </div>
    </div>
  );
};
