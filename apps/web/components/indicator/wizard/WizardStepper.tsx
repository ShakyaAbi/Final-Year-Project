import React from "react";
import { Check } from "lucide-react";

interface WizardStepperProps {
  steps: string[];
  currentStep: number;
}

export const WizardStepper: React.FC<WizardStepperProps> = ({
  steps,
  currentStep,
}) => {
  return (
    <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center">
                <div
                  className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                  ${
                    isCompleted
                      ? "bg-green-500 text-white"
                      : isCurrent
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-500"
                  }
                `}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <span
                  className={`ml-3 text-sm font-medium hidden sm:block ${
                    isCurrent ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  {step}
                </span>
              </div>
              {index !== steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-4 ${
                    isCompleted ? "bg-green-500" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
