import React, { useState } from 'react';
import { LogframeNode, NodeType } from '../types';
import { Target, CircleDot, ArrowRight, CheckSquare, Plus, Edit2, AlertCircle, FileText, ShieldAlert } from 'lucide-react';

interface LogframeTreeProps {
  node: LogframeNode;
  onEdit: (node: LogframeNode) => void;
  onAddChild: (parentNode: LogframeNode) => void;
  isRoot?: boolean;
}

const NodeIcon = ({ type }: { type: NodeType }) => {
  switch (type) {
    case NodeType.GOAL: return <Target className="w-5 h-5 text-purple-600" />;
    case NodeType.OUTCOME: return <CircleDot className="w-5 h-5 text-blue-600" />;
    case NodeType.OUTPUT: return <ArrowRight className="w-5 h-5 text-indigo-600" />;
    case NodeType.ACTIVITY: return <CheckSquare className="w-5 h-5 text-emerald-600" />;
    default: return <CircleDot className="w-5 h-5" />;
  }
};

const getChildTypeLabel = (type: NodeType) => {
  switch (type) {
    case NodeType.GOAL: return 'Outcome';
    case NodeType.OUTCOME: return 'Output';
    case NodeType.OUTPUT: return 'Activity';
    default: return null;
  }
};

export const LogframeTree: React.FC<LogframeTreeProps> = ({ node, onEdit, onAddChild, isRoot = false }) => {
  const hasChildren = node.children && node.children.length > 0;
  const canHaveChildren = node.type !== NodeType.ACTIVITY;
  const childLabel = getChildTypeLabel(node.type);
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="relative">
      {/* Node Card */}
      <div className={`
        group relative flex flex-col rounded-lg border transition-all hover:shadow-md bg-white
        ${isRoot ? 'border-purple-200 bg-purple-50/30 mb-6 shadow-sm' : 'border-slate-200 mb-3'}
      `}>
        {/* Top Row: Icon, Title, Actions */}
        <div className="p-4 flex items-start">
          <div className="mt-1 mr-3 flex-shrink-0">
            <NodeIcon type={node.type} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded
                  ${node.type === NodeType.GOAL ? 'bg-purple-100 text-purple-700' : 
                    node.type === NodeType.OUTCOME ? 'bg-blue-100 text-blue-700' : 
                    node.type === NodeType.OUTPUT ? 'bg-indigo-100 text-indigo-700' : 
                    'bg-emerald-100 text-emerald-700'
                  }
                `}>
                  {node.type}
                </span>
                <h4 className="text-sm font-semibold text-slate-900 truncate">{node.title}</h4>
              </div>
              
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => onEdit(node)}
                  className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Edit details"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                {canHaveChildren && (
                  <button 
                    onClick={() => onAddChild(node)}
                    className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                    title={`Add ${childLabel}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            {node.description && (
              <p className="text-sm text-slate-600 mb-3 line-clamp-2">{node.description}</p>
            )}

            {/* Metadata Badges (Risks, Assumptions, Verification) */}
            <div className="flex flex-wrap gap-2 mt-2">
              {node.indicatorCount !== undefined && node.indicatorCount > 0 && (
                <span className="inline-flex items-center text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                  <Target className="w-3 h-3 mr-1" /> {node.indicatorCount} Indicators
                </span>
              )}
              {node.risks && (
                <span className="inline-flex items-center text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded border border-amber-200" title={node.risks}>
                  <ShieldAlert className="w-3 h-3 mr-1" /> Risk Defined
                </span>
              )}
              {node.assumptions && (
                <span className="inline-flex items-center text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200" title={node.assumptions}>
                  <AlertCircle className="w-3 h-3 mr-1" /> Assumption
                </span>
              )}
              {node.verificationMethod && (
                <span className="inline-flex items-center text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100" title={node.verificationMethod}>
                  <FileText className="w-3 h-3 mr-1" /> Verification
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Recursive Children Rendering with visual line */}
      {hasChildren && (
        <div className="pl-6 sm:pl-8 flex flex-col">
          <div className="relative border-l-2 border-slate-200 pl-6 sm:pl-8 pt-2 pb-2 space-y-2">
             {/* Decorative curve for first child could be added here if desired */}
            {node.children?.map((child) => (
              <LogframeTree 
                key={child.id} 
                node={child} 
                onEdit={onEdit}
                onAddChild={onAddChild}
                isRoot={false}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Empty state placeholder for non-leaf nodes with no children */}
      {canHaveChildren && !hasChildren && (
        <div className="pl-12 sm:pl-16 py-2">
          <button 
            onClick={() => onAddChild(node)}
            className="flex items-center text-xs font-medium text-slate-400 hover:text-blue-600 transition-colors border border-dashed border-slate-300 rounded-md px-3 py-2 w-full sm:w-auto bg-slate-50/50 hover:bg-blue-50 hover:border-blue-300"
          >
            <Plus className="w-3 h-3 mr-1.5" />
            Add {childLabel}
          </button>
        </div>
      )}
    </div>
  );
};