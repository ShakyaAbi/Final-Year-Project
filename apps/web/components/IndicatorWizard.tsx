import React, { useState } from "react";
import {
  Project,
  Indicator,
  IndicatorType,
  AnomalyConfig,
} from "../types";
import { Button } from "./ui/Button";
import {
  ChevronRight,
  Trash2,
} from "lucide-react";
import { api } from "../services/api";
import { useNavigate } from "react-router-dom";

// Steps Components
import { WizardStepper } from "./indicator/wizard/WizardStepper";
import { WizardStepContext } from "./indicator/wizard/WizardStepContext";
import { WizardStepDetails } from "./indicator/wizard/WizardStepDetails";
import { WizardStepFormat } from "./indicator/wizard/WizardStepFormat";
import { WizardStepRules } from "./indicator/wizard/WizardStepRules";
import { WizardStepFrequency } from "./indicator/wizard/WizardStepFrequency";
import { WizardStepReview } from "./indicator/wizard/WizardStepReview";

interface IndicatorWizardProps {
  project: Project;
  onClose: () => void;
  initialNodeId?: string | null;
  editingIndicator?: Indicator | null;
}

export const IndicatorWizard: React.FC<IndicatorWizardProps> = ({
  project,
  onClose,
  initialNodeId,
  editingIndicator,
}) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const steps = [
    "Context",
    "Details",
    "Format",
    "Rules",
    "Frequency",
    "Review",
  ];
  
  const selectableTypes = [
    IndicatorType.NUMBER,
    IndicatorType.PERCENTAGE,
    IndicatorType.CURRENCY,
    IndicatorType.BOOLEAN,
    IndicatorType.CATEGORICAL,
  ];

  // Form State
const defaultAnomalyConfig: AnomalyConfig = {
     enabled: true,
     mode: "RULES",
     rules: { range: true, maxChangePercent: 50 },
     outlier: { method: "MAD", threshold: 3.5, windowSize: 8, minPoints: 6 },
     trend: { method: "SLOPE_SHIFT", threshold: 2, windowSize: 6 },
     ml: {
       method: "ISOLATION_FOREST",
       contamination: 0.05,
       windowSize: 50,
       minPoints: 5,
       seed: 42,
     },
     fallback: {
       useRangeChecks: true,
       useRulesWhenInsufficientData: true,
       useRulesOnServiceError: true,
     },
   };

  const [formData, setFormData] = useState<Partial<Indicator>>(
    editingIndicator
      ? {
          ...editingIndicator,
          nodeId: editingIndicator.nodeId || initialNodeId,
        }
      : {
          projectId: project.id,
          nodeId: initialNodeId || undefined,
          type: IndicatorType.NUMBER,
          frequency: "Weekly",
          booleanLabels: { true: "Yes", false: "No" },
          decimals: 2,
          anomalyConfig: defaultAnomalyConfig,
          categories: [],
          categoryConfig: { allowMultiple: false, required: true },
        },
  );

  const updateField = (field: keyof Indicator, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

const updateAnomalyConfig = (patch: Partial<AnomalyConfig>) => {
     setFormData((prev) => {
       const current = prev.anomalyConfig ?? defaultAnomalyConfig;
       
       // Only merge sub-configurations if they exist in the patch
       const anomalyConfig = { ...current, ...patch };
       
       if (patch.rules !== undefined) {
         anomalyConfig.rules = { ...current.rules, ...patch.rules };
       }
       
       if (patch.outlier !== undefined) {
         anomalyConfig.outlier = { ...current.outlier, ...patch.outlier };
       }
       
       if (patch.trend !== undefined) {
         anomalyConfig.trend = { ...current.trend, ...patch.trend };
       }
       
       if (patch.ml !== undefined) {
         anomalyConfig.ml = { ...current.ml, ...patch.ml };
       }
       
       if (patch.fallback !== undefined) {
         anomalyConfig.fallback = { ...current.fallback, ...patch.fallback };
       }
       
       return {
         ...prev,
         anomalyConfig,
       };
     });
   };

  const handleNext = () => {
    if (step < steps.length - 1) setStep((s) => s + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      if (editingIndicator) {
        await api.updateIndicator(editingIndicator.id, formData);
        onClose();
        window.location.reload();
      } else {
        const newIndicator = {
          ...formData,
          status: "Active",
          currentVersion: 1,
          versions: [
            {
              version: 1,
              createdAt: new Date().toISOString(),
              changes: "Initial Creation",
              active: true,
            },
          ],
          values: [],
        } as Indicator;

        const created = await api.createIndicator(project.id, newIndicator);
        onClose();
        navigate(`/indicators/${created.id}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteIndicator = async () => {
    if (!editingIndicator || isDeleting) return;
    const confirmed = window.confirm(
      `Delete indicator "${editingIndicator.name}"? This cannot be undone.`,
    );
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await api.deleteIndicator(editingIndicator.id);
      onClose();
      window.location.reload();
    } catch (error) {
      console.error("Failed to delete indicator", error);
      alert("Failed to delete indicator.");
    } finally {
      setIsDeleting(false);
    }
  };

  const isStepValid = () => {
    switch (step) {
      case 0:
        return !!formData.nodeId;
      case 1:
        return !!formData.name;
      case 3:
        if (formData.type === IndicatorType.CATEGORICAL) return true;
        return !!formData.target || formData.target === 0;
      case 4:
        return !!formData.frequency;
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 0:
        return (
          <WizardStepContext
            project={project}
            nodeId={formData.nodeId}
            onSelectNode={(id) => updateField("nodeId", id)}
          />
        );
      case 1:
        return (
          <WizardStepDetails
            formData={formData}
            updateField={updateField}
          />
        );
      case 2:
        return (
          <WizardStepFormat
            formData={formData}
            updateField={updateField}
            selectableTypes={selectableTypes}
          />
        );
      case 3:
        return (
          <WizardStepRules
            formData={formData}
            updateField={updateField}
            updateAnomalyConfig={updateAnomalyConfig}
          />
        );
      case 4:
        return (
          <WizardStepFrequency
            formData={formData}
            updateField={updateField}
          />
        );
      case 5:
        return (
          <WizardStepReview
            project={project}
            formData={formData}
            setStep={setStep}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full rounded-xl overflow-hidden">
      {/* Wizard Header */}
      <div className="bg-white pt-6 pb-2">
        <h1 className="text-2xl font-bold text-center text-slate-900">
          {editingIndicator ? "Edit Indicator" : "Set up Indicator"}
        </h1>
        <p className="text-center text-slate-500 mt-1">
          {editingIndicator
            ? "Update your indicator settings"
            : "Define measurement rules for your logframe"}
        </p>
      </div>

      <WizardStepper steps={steps} currentStep={step} />

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-white">
        {renderStepContent()}
      </div>

      {/* Sticky Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center rounded-b-xl">
        <div className="flex items-center gap-2">
          {editingIndicator && (
            <Button
              variant="danger"
              onClick={handleDeleteIndicator}
              isLoading={isDeleting}
            >
              <Trash2 className="w-4 h-4 mr-2" /> Delete Indicator
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>

        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="secondary" onClick={handleBack}>
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            disabled={!isStepValid() || isSubmitting || isDeleting}
            isLoading={isSubmitting}
            className="min-w-[120px]"
          >
            {step === steps.length - 1
              ? editingIndicator
                ? "Save Changes"
                : "Create Indicator"
              : "Next"}
            {step !== steps.length - 1 && (
              <ChevronRight className="w-4 h-4 ml-2" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
