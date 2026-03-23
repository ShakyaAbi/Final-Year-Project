import React from "react";
import { LogframeNode, NodeType } from "../../../types";

interface NodeSelectorProps {
  nodes: LogframeNode[];
  selectedId: string;
  onSelect: (id: string) => void;
  level?: number;
}

export const NodeSelector: React.FC<NodeSelectorProps> = ({
  nodes,
  selectedId,
  onSelect,
  level = 0,
}) => {
  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <div key={node.id}>
          <div
            onClick={() => onSelect(node.id)}
            className={`
              flex items-center p-3 rounded-lg cursor-pointer border transition-all
              ${
                selectedId === node.id
                  ? "bg-blue-50 border-blue-500 ring-1 ring-blue-500"
                  : "bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50"
              }
            `}
            style={{ marginLeft: `${level * 24}px` }}
          >
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded mr-3 ${
                node.type === NodeType.GOAL
                  ? "bg-purple-100 text-purple-700"
                  : node.type === NodeType.OUTCOME
                    ? "bg-blue-100 text-blue-700"
                    : node.type === NodeType.OUTPUT
                      ? "bg-indigo-100 text-indigo-700"
                      : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {node.type}
            </span>
            <span className="text-sm font-medium text-slate-900">
              {node.title}
            </span>
          </div>
          {node.children && (
            <NodeSelector
              nodes={node.children}
              selectedId={selectedId}
              onSelect={onSelect}
              level={level + 1}
            />
          )}
        </div>
      ))}
    </div>
  );
};
