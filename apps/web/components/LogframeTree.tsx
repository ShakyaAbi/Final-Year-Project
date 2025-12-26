
import React, { useState } from 'react';
import { LogframeNode, NodeType, Indicator } from '../types';
import { Target, CircleDot, ArrowRight, CheckSquare, Plus, Edit2, AlertCircle, FileText, ShieldAlert, BarChart2 } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LogframeTreeProps {
  node: LogframeNode;
  indicators: Indicator[]; // Pass full list, filter locally
  onEdit: (node: LogframeNode) => void;
  onAddChild: (parentNode: LogframeNode) => void;
  onAddIndicator: (parentNode: LogframeNode) => void;
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

export const LogframeTree: React.FC<LogframeTreeProps> = ({ node, indicators, onEdit, onAddChild, onAddIndicator, isRoot = false }) => {
  const hasChildren = node.children && node.children.length > 0;
  const canHaveChildren = node.type !== NodeType.ACTIVITY;
  const childLabel = getChildTypeLabel(node.type);
  
  // Filter indicators for this specific node
  const nodeIndicators = indicators.filter(i => i.nodeId === node.id);

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
                 {/* Add Indicator Action */}
                <button 
                  onClick={() => onAddIndicator(node)}
                  className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors"
                  title="Add Indicator"
                >
                  <BarChart2 className="w-4 h-4" />
                </button>
                
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

            {/* Metadata Badges */}
            <div className="flex flex-wrap gap-2 mt-2">
              {nodeIndicators.length > 0 && (
                <span className="inline-flex items-center text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded border border-slate-200">
                  <Target className="w-3 h-3 mr-1" /> {nodeIndicators.length} Indicators
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

            {/* Embedded Indicators List */}
            {nodeIndicators.length > 0 && (
               <div className="mt-4 border-t border-slate-100 pt-3">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Indicators</h5>
                  <div className="grid grid-cols-1 gap-2">
                     {nodeIndicators.map(ind => (
                        <Link 
                          key={ind.id} 
                          to={`/indicators/${ind.id}`}
                          className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-white rounded border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all text-sm group/ind"
                        >
                           <div className="flex items-center gap-3 overflow-hidden">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></span>
                              <span className="truncate font-medium text-slate-700 group-hover/ind:text-blue-700">{ind.name}</span>
                              <span className="text-xs text-slate-400 border border-slate-200 px-1.5 rounded">{ind.type}</span>
                           </div>
                           <div className="flex items-center gap-4 text-xs">
                              <div className="flex flex-col items-end">
                                <span className="text-slate-400 text-[9px] uppercase font-bold">Target</span>
                                <span className="font-semibold text-slate-900">{ind.target}</span>
                              </div>
                              <ArrowRight className="w-3 h-3 text-slate-300 group-hover/ind:text-blue-400" />
                           </div>
                        </Link>
                     ))}
                  </div>
               </div>
            )}
            
            {/* Empty state for indicators if none exist but user might want to add */}
            {nodeIndicators.length === 0 && (
               <div className="mt-3 pt-2 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onAddIndicator(node)}
                    className="text-xs flex items-center text-slate-400 hover:text-purple-600 transition-colors"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add measure/indicator
                  </button>
               </div>
            )}

          </div>
        </div>
      </div>

      {/* Recursive Children Rendering */}
      {hasChildren && (
        <div className="pl-6 sm:pl-8 flex flex-col">
          <div className="relative border-l-2 border-slate-200 pl-6 sm:pl-8 pt-2 pb-2 space-y-2">
            {node.children?.map((child) => (
              <LogframeTree 
                key={child.id} 
                node={child} 
                indicators={indicators}
                onEdit={onEdit}
                onAddChild={onAddChild}
                onAddIndicator={onAddIndicator}
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
