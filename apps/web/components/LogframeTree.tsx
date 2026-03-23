import React, { useState } from 'react';
import { LogframeNode, NodeType, Indicator } from '../types';
import { Target, CircleDot, ArrowRight, CheckSquare, Plus, Edit2, AlertCircle, FileText, ShieldAlert, BarChart2, ChevronDown, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LogframeTreeProps {
  node: LogframeNode;
  indicators: Indicator[];
  onEdit: (node: LogframeNode) => void;
  onAddChild: (parentNode: LogframeNode) => void;
  onAddIndicator: (parentNode: LogframeNode) => void;
  isRoot?: boolean;
}

const NodeIcon = ({ type }: { type: NodeType }) => {
  switch (type) {
    case NodeType.GOAL: return <Target className="w-5 h-5 text-violet-600" />;
    case NodeType.OUTCOME: return <CircleDot className="w-5 h-5 text-blue-600" />;
    case NodeType.OUTPUT: return <ArrowRight className="w-5 h-5 text-cyan-600" />;
    case NodeType.ACTIVITY: return <CheckSquare className="w-5 h-5 text-amber-600" />;
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
  const [isExpanded, setIsExpanded] = useState(true);
  
  const hasChildren = node.children && node.children.length > 0;
  const canHaveChildren = node.type !== NodeType.ACTIVITY;
  const childLabel = getChildTypeLabel(node.type);
  
  const nodeIndicators = indicators.filter(i => i.nodeId === node.id);

  return (
    <div className="relative">
      {/* Node Card */}
      <div className={`
        group relative flex flex-col rounded-xl border transition-all hover:shadow-md bg-white
        ${isRoot ? 'border-violet-200 bg-violet-50/20 mb-6 shadow-sm' : 'border-slate-200 mb-3'}
        ${!isRoot ? 'before:content-[\'\'] before:absolute before:-left-6 sm:before:-left-8 before:top-8 before:w-6 sm:before:w-8 before:border-t-2 before:border-slate-200' : ''}
      `}>
        <div className="p-4 flex items-start">
          <div className="mt-1 mr-3 flex-shrink-0">
            <NodeIcon type={node.type} />
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {hasChildren && (
                  <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="p-1 -ml-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                    title={isExpanded ? "Collapse" : "Expand"}
                  >
                    {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                  </button>
                )}
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md
                  ${node.type === NodeType.GOAL ? 'bg-violet-100 text-violet-700' : 
                    node.type === NodeType.OUTCOME ? 'bg-blue-100 text-blue-700' : 
                    node.type === NodeType.OUTPUT ? 'bg-cyan-100 text-cyan-700' : 
                    'bg-amber-100 text-amber-700'
                  }
                `}>
                  {node.type}
                </span>
                <h4 className="text-sm font-bold text-slate-900 truncate">{node.title}</h4>
              </div>
              
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => onAddIndicator(node)}
                  className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded transition-colors"
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
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                    title={`Add ${childLabel}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            {node.description && (
              <p className="text-sm text-slate-600 mb-3 leading-relaxed">{node.description}</p>
            )}

            {/* Metadata Sections for Risks and Assumptions */}
            {(node.assumptions || node.risks) && (
              <div className="mt-4 mb-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {node.assumptions && (
                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-slate-500" /> Assumptions
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{node.assumptions}</p>
                  </div>
                )}
                {node.risks && (
                  <div className="bg-amber-50/50 border border-amber-100/50 rounded-lg p-3">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800 mb-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Risks
                    </div>
                    <p className="text-xs text-amber-700/80 leading-relaxed">{node.risks}</p>
                  </div>
                )}
              </div>
            )}

            {/* Embedded Indicators List */}
            {nodeIndicators.length > 0 && (
               <div className="mt-4 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Indicators ({nodeIndicators.length})</h5>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                     {nodeIndicators.map(ind => (
                        <Link 
                          key={ind.id} 
                          to={`/indicators/${ind.id}`}
                          className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-white rounded-lg border border-slate-100 hover:border-blue-200 hover:shadow-sm transition-all text-sm group/ind"
                        >
                           <div className="flex items-center gap-3 overflow-hidden">
                              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"></span>
                              <span className="truncate font-medium text-slate-700 group-hover/ind:text-blue-700">{ind.name}</span>
                              <span className="text-[10px] font-medium text-slate-500 border border-slate-200 bg-white px-1.5 py-0.5 rounded uppercase tracking-wide">{ind.type}</span>
                           </div>
                           <div className="flex items-center gap-4 text-xs ml-4">
                              <div className="flex flex-col items-end">
                                <span className="text-slate-400 text-[9px] uppercase font-bold tracking-wider">Target</span>
                                <span className="font-semibold text-slate-900">{ind.target}</span>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover/ind:text-blue-500" />
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
                    className="text-xs flex items-center font-medium text-slate-500 hover:text-violet-600 transition-colors"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add measure/indicator
                  </button>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* Recursive Children Rendering */}
      {isExpanded && hasChildren && (
        <div className="pl-6 sm:pl-8 flex flex-col relative">
          <div className="absolute left-[11px] top-[-12px] bottom-6 w-0.5 bg-slate-200"></div>
          <div className="space-y-2">
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
      {isExpanded && canHaveChildren && !hasChildren && (
        <div className="pl-12 sm:pl-16 py-2 relative">
          <div className="absolute left-[11px] top-[-12px] bottom-1/2 w-0.5 bg-slate-200"></div>
          <div className="absolute left-[11px] top-1/2 w-6 sm:w-8 border-t-2 border-slate-200"></div>
          <button 
            onClick={() => onAddChild(node)}
            className="relative flex items-center text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors border border-dashed border-slate-300 rounded-lg px-3 py-2.5 w-full sm:w-auto bg-slate-50/50 hover:bg-blue-50 hover:border-blue-300 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Add {childLabel}
          </button>
        </div>
      )}
    </div>
  );
};

