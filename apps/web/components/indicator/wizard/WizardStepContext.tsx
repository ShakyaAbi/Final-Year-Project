import React from "react";
import { Project, LogframeNode } from "../../../types";
import { NodeSelector } from "./NodeSelector";

interface WizardStepContextProps {
  project: Project;
  nodeId: string | undefined;
  onSelectNode: (id: string) => void;
}

export const WizardStepContext: React.FC<WizardStepContextProps> = ({
  project,
  nodeId,
  onSelectNode,
}) => {
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-slate-900 mb-2">
        Select Logframe Context
      </h2>
      <p className="text-slate-500 mb-6">
        Which logframe component is this indicator measuring?
      </p>

      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-[50vh] overflow-y-auto">
        {project.logframe.length > 0 ? (
          <NodeSelector
            nodes={project.logframe}
            selectedId={nodeId || ""}
            onSelect={onSelectNode}
          />
        ) : (
          <div className="text-center p-8 text-slate-500">
            No logframe defined yet. Please add goals first.
          </div>
        )}
      </div>
    </div>
  );
};
