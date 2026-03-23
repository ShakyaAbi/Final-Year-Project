import React from "react";
import { Layers, Type, Target } from "lucide-react";
import { Project, Indicator } from "../../../types";

interface WizardStepReviewProps {
  project: Project;
  formData: Partial<Indicator>;
  setStep: (step: number) => void;
}

export const WizardStepReview: React.FC<WizardStepReviewProps> = ({
  project,
  formData,
  setStep,
}) => {
  return (
    <div className="max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold text-slate-900 mb-6">
        Review & Confirm
      </h2>

      <div className="space-y-4">
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700 flex items-center">
              <Layers className="w-4 h-4 mr-2" /> Context
            </h3>
            <button
              onClick={() => setStep(0)}
              className="text-xs text-blue-600 hover:underline"
            >
              Edit
            </button>
          </div>
          <div className="p-4">
            <span className="text-sm text-slate-500 block mb-1">
              Selected Node
            </span>
            <p className="font-medium text-slate-900">
              {project.logframe
                .flatMap((n) => [
                  n,
                  ...(n.children || []).flatMap((c) => [
                    c,
                    ...(c.children || []).flatMap((cc) => [
                      cc,
                      ...(cc.children || []),
                    ]),
                  ]),
                ])
                .find((n) => n.id === formData.nodeId)?.title ||
                "Unknown Node"}
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700 flex items-center">
              <Type className="w-4 h-4 mr-2" /> Definition
            </h3>
            <button
              onClick={() => setStep(1)}
              className="text-xs text-blue-600 hover:underline"
            >
              Edit
            </button>
          </div>
          <div className="p-4 space-y-2">
            <div>
              <span className="text-sm text-slate-500">Name:</span>{" "}
              <span className="font-medium">{formData.name}</span>
            </div>
            {formData.code && (
              <div>
                <span className="text-sm text-slate-500">Code:</span>{" "}
                <span className="font-medium font-mono bg-slate-100 px-1 rounded">
                  {formData.code}
                </span>
              </div>
            )}
            <p className="text-sm text-slate-600 mt-2 italic">
              {formData.description}
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
            <h3 className="font-semibold text-slate-700 flex items-center">
              <Target className="w-4 h-4 mr-2" /> Rules
            </h3>
            <button
              onClick={() => setStep(3)}
              className="text-xs text-blue-600 hover:underline"
            >
              Edit
            </button>
          </div>
          <div className="p-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500">Type:</span>{" "}
              <span className="font-medium">{formData.type}</span>
            </div>
            <div>
              <span className="text-slate-500">Target:</span>{" "}
              <span className="font-bold text-blue-600">
                {formData.target}
              </span>
            </div>
            <div>
              <span className="text-slate-500">Baseline:</span>{" "}
              <span className="font-medium">{formData.baseline}</span>
            </div>
            <div>
              <span className="text-slate-500">Frequency:</span>{" "}
              <span className="font-medium">{formData.frequency}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
