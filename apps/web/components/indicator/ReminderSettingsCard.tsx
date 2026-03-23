import React from "react";
import { BellRing } from "lucide-react";
import { Indicator } from "../../types";
import { Button } from "../ui/Button";

interface ReminderSettingsCardProps {
  indicator: Indicator;
  isEditingSettings: boolean;
  setIsEditingSettings: (editing: boolean) => void;
  settingsForm: {
    frequency: Indicator["frequency"];
    reminderEnabled: boolean;
    reminderDaysBeforeDue: number;
    reminderDaysAfterDue: number;
  };
  setSettingsForm: (form: any) => void;
  handleUpdateSettings: () => Promise<void>;
  saving: boolean;
}

export const ReminderSettingsCard: React.FC<ReminderSettingsCardProps> = ({
  indicator,
  isEditingSettings,
  setIsEditingSettings,
  settingsForm,
  setSettingsForm,
  handleUpdateSettings,
  saving,
}) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <BellRing className="w-4 h-4 text-blue-600" />
          Reminder Settings
        </h3>
        {!isEditingSettings && (
          <button
            onClick={() => setIsEditingSettings(true)}
            className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider"
          >
            Configure
          </button>
        )}
      </div>

      <div className="p-5">
        {!isEditingSettings ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Frequency:</span>
              <span className="font-semibold text-slate-700">
                {indicator.frequency}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Automatic Reminders:</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${indicator.reminderEnabled ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
              >
                {indicator.reminderEnabled ? "ENABLED" : "DISABLED"}
              </span>
            </div>
            {indicator.reminderEnabled && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                    Pre-reminder
                  </div>
                  <div className="text-sm font-medium text-slate-700">
                    {indicator.reminderDaysBeforeDue || 0} days before
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">
                    Overdue Alert
                  </div>
                  <div className="text-sm font-medium text-slate-700">
                    {indicator.reminderDaysAfterDue || 0} days after
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Reporting Frequency
              </label>
              <select
                value={settingsForm.frequency}
                onChange={(e) =>
                  setSettingsForm({
                    ...settingsForm,
                    frequency: e.target.value as any,
                  })
                }
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="Daily">Daily</option>
                <option value="Weekly">Weekly</option>
                <option value="Monthly">Monthly</option>
                <option value="Quarterly">Quarterly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${settingsForm.reminderEnabled ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-400"}`}
                >
                  <BellRing className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Enable Reminders
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Notify assigned users when data is due
                  </p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settingsForm.reminderEnabled}
                  onChange={(e) =>
                    setSettingsForm({
                      ...settingsForm,
                      reminderEnabled: e.target.checked,
                    })
                  }
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {settingsForm.reminderEnabled && (
              <div className="grid grid-cols-2 gap-4 animate-in zoom-in-95 duration-200">
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Days Before Due
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={settingsForm.reminderDaysBeforeDue}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        reminderDaysBeforeDue: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">
                    Days After Due
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={settingsForm.reminderDaysAfterDue}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        reminderDaysAfterDue: parseInt(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                size="sm"
                onClick={handleUpdateSettings}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Settings"}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                size="sm"
                onClick={() => setIsEditingSettings(false)}
                disabled={saving}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
