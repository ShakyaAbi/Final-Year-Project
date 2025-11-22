import React, { useState, useEffect } from 'react';
import { Project, LogframeNode, IndicatorType, Indicator, NodeType } from '../types';
import { Button } from './ui/Button';
import { ChevronRight, Check, CircleDot, Calendar, Layers, Hash, Type, AlertCircle, Target, Tag } from 'lucide-react';
import { createIndicator } from '../services/mockService';
import { useNavigate } from 'react-router-dom';

interface IndicatorWizardProps {
  project: Project;
  onClose: () => void;
}

// Stepper Component
const WizardStepper = ({ steps, currentStep }: { steps: string[], currentStep: number }) => {
  return (
    <div className="bg-slate-50 border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          
          return (
            <div key={step} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors
                  ${isCompleted ? 'bg-green-500 text-white' : isCurrent ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}
                `}>
                  {isCompleted ? <Check className="w-4 h-4" /> : index + 1}
                </div>
                <span className={`ml-3 text-sm font-medium hidden sm:block ${isCurrent ? 'text-slate-900' : 'text-slate-500'}`}>
                  {step}
                </span>
              </div>
              {index !== steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-4 ${isCompleted ? 'bg-green-500' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Simple recursive tree for selection
const NodeSelector = ({ nodes, selectedId, onSelect, level = 0 }: { nodes: LogframeNode[], selectedId: string, onSelect: (id: string) => void, level?: number }) => {
  return (
    <div className="space-y-1">
      {nodes.map(node => (
        <div key={node.id}>
          <div 
            onClick={() => onSelect(node.id)}
            className={`
              flex items-center p-3 rounded-lg cursor-pointer border transition-all
              ${selectedId === node.id 
                ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' 
                : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'}
            `}
            style={{ marginLeft: `${level * 24}px` }}
          >
            <span className={`text-xs font-bold px-2 py-0.5 rounded mr-3 ${
              node.type === NodeType.GOAL ? 'bg-purple-100 text-purple-700' :
              node.type === NodeType.OUTCOME ? 'bg-blue-100 text-blue-700' :
              node.type === NodeType.OUTPUT ? 'bg-indigo-100 text-indigo-700' :
              'bg-emerald-100 text-emerald-700'
            }`}>
              {node.type}
            </span>
            <span className="text-sm font-medium text-slate-900">{node.title}</span>
          </div>
          {node.children && <NodeSelector nodes={node.children} selectedId={selectedId} onSelect={onSelect} level={level + 1} />}
        </div>
      ))}
    </div>
  );
};

export const IndicatorWizard: React.FC<IndicatorWizardProps> = ({ project, onClose }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const steps = ['Context', 'Details', 'Format', 'Rules', 'Frequency', 'Review'];

  // Form State
  const [formData, setFormData] = useState<Partial<Indicator>>({
    projectId: project.id,
    type: IndicatorType.NUMBER,
    frequency: 'Weekly',
    booleanLabels: { true: 'Yes', false: 'No' },
    categories: [],
    decimals: 2
  });

  // Temporary state for inputs
  const [newCategory, setNewCategory] = useState('');

  const updateField = (field: keyof Indicator, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step < steps.length - 1) setStep(s => s + 1);
    else handleSubmit();
  };

  const handleBack = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const newIndicator = {
        ...formData,
        id: `ind-${Date.now()}`,
        status: 'Active',
        currentVersion: 1,
        versions: [{ version: 1, createdAt: new Date().toISOString(), changes: 'Initial Creation', active: true }],
        values: []
      } as Indicator;

      await createIndicator(newIndicator);
      onClose();
      navigate(`/indicators/${newIndicator.id}`);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Validation Logic
  const isStepValid = () => {
    switch (step) {
      case 0: return !!formData.nodeId; // Must select node
      case 1: return !!formData.name; // Name required
      case 2: return true; // Type always has default
      case 3: 
        if (formData.type === IndicatorType.CATEGORICAL) {
          return (formData.categories?.length || 0) > 0;
        }
        return !!formData.target || formData.target === 0;
      case 4: return !!formData.frequency;
      default: return true;
    }
  };

  // --- Step Renders ---

  const renderStepContent = () => {
    switch (step) {
      case 0: // Context
        return (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Select Logframe Context</h2>
            <p className="text-slate-500 mb-6">Which logframe component is this indicator measuring?</p>
            
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 max-h-[50vh] overflow-y-auto">
               {project.logframe.length > 0 ? (
                 <NodeSelector 
                   nodes={project.logframe} 
                   selectedId={formData.nodeId || ''} 
                   onSelect={(id) => updateField('nodeId', id)} 
                 />
               ) : (
                 <div className="text-center p-8 text-slate-500">No logframe defined yet. Please add goals first.</div>
               )}
            </div>
          </div>
        );

      case 1: // Basic Details
        return (
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Indicator Details</h2>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Indicator Name <span className="text-red-500">*</span></label>
              <input 
                type="text"
                value={formData.name || ''}
                onChange={e => updateField('name', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="e.g., Percentage of households with improved sanitation"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Short Code (Optional)</label>
              <input 
                type="text"
                value={formData.code || ''}
                onChange={e => updateField('code', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm"
                placeholder="e.g., IND-WASH-01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea 
                rows={4}
                value={formData.description || ''}
                onChange={e => updateField('description', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Provide a clear definition, method of calculation, and purpose."
              />
            </div>
          </div>
        );

      case 2: // Type & Format
        return (
          <div className="max-w-2xl mx-auto space-y-6">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Type & Data Format</h2>
            
            <div className="grid grid-cols-2 gap-4">
              {Object.values(IndicatorType).map(t => (
                <div 
                  key={t}
                  onClick={() => updateField('type', t)}
                  className={`
                    cursor-pointer p-4 rounded-lg border-2 text-center transition-all
                    ${formData.type === t ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:border-slate-300'}
                  `}
                >
                  {t === IndicatorType.NUMBER && <Hash className="w-6 h-6 mx-auto mb-2" />}
                  {t === IndicatorType.PERCENTAGE && <CircleDot className="w-6 h-6 mx-auto mb-2" />}
                  {t === IndicatorType.CURRENCY && <span className="block text-xl font-bold mb-2">$</span>}
                  {t === IndicatorType.CATEGORICAL && <Tag className="w-6 h-6 mx-auto mb-2" />}
                  {t === IndicatorType.BOOLEAN && <Check className="w-6 h-6 mx-auto mb-2" />}
                  <span className="font-semibold">{t}</span>
                </div>
              ))}
            </div>

            {(formData.type === IndicatorType.NUMBER || formData.type === IndicatorType.PERCENTAGE) && (
              <div className="grid grid-cols-2 gap-4 mt-4 bg-slate-50 p-4 rounded-lg">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Unit of Measure</label>
                   <input 
                      type="text"
                      value={formData.unit || ''}
                      onChange={e => updateField('unit', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                      placeholder={formData.type === IndicatorType.PERCENTAGE ? '%' : 'e.g., kg, people'}
                   />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Decimal Places</label>
                   <select 
                      value={formData.decimals}
                      onChange={e => updateField('decimals', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                   >
                     <option value="0">0 (Integer)</option>
                     <option value="1">1 (0.1)</option>
                     <option value="2">2 (0.01)</option>
                   </select>
                </div>
              </div>
            )}

            {formData.type === IndicatorType.CATEGORICAL && (
              <div className="bg-slate-50 p-4 rounded-lg">
                <label className="block text-sm font-medium text-slate-700 mb-2">Categories</label>
                <div className="flex gap-2 mb-3">
                  <input 
                    type="text"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newCategory) {
                          updateField('categories', [...(formData.categories || []), newCategory]);
                          setNewCategory('');
                        }
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md"
                    placeholder="Type category and press Enter"
                  />
                  <Button 
                    type="button" 
                    onClick={() => {
                      if (newCategory) {
                        updateField('categories', [...(formData.categories || []), newCategory]);
                        setNewCategory('');
                      }
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.categories?.map((cat, idx) => (
                    <span key={idx} className="bg-white border border-slate-200 px-2 py-1 rounded-md text-sm flex items-center">
                      {cat}
                      <button 
                        onClick={() => updateField('categories', formData.categories?.filter((_, i) => i !== idx))}
                        className="ml-2 text-slate-400 hover:text-red-500"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                  {(!formData.categories || formData.categories.length === 0) && (
                    <span className="text-sm text-slate-400 italic">No categories added yet.</span>
                  )}
                </div>
              </div>
            )}

            {formData.type === IndicatorType.BOOLEAN && (
              <div className="bg-slate-50 p-4 rounded-lg grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">True Label</label>
                    <input 
                       type="text"
                       value={formData.booleanLabels?.true || 'Yes'}
                       onChange={e => updateField('booleanLabels', { ...formData.booleanLabels, true: e.target.value })}
                       className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                 </div>
                 <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">False Label</label>
                    <input 
                       type="text"
                       value={formData.booleanLabels?.false || 'No'}
                       onChange={e => updateField('booleanLabels', { ...formData.booleanLabels, false: e.target.value })}
                       className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                 </div>
              </div>
            )}
          </div>
        );

      case 3: // Target & Validation
        return (
          <div className="max-w-2xl mx-auto space-y-6">
             <h2 className="text-xl font-bold text-slate-900 mb-2">Target & Rules</h2>
             
             <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3 mb-6">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-800">Values entered outside of the defined range will be flagged or rejected during data entry.</p>
             </div>

             {/* Conditional Input for Target based on Type */}
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Target Value <span className="text-red-500">*</span></label>
                
                {formData.type === IndicatorType.CATEGORICAL ? (
                  <select 
                    value={formData.target as string}
                    onChange={e => updateField('target', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  >
                    <option value="">Select target category...</option>
                    {formData.categories?.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                ) : formData.type === IndicatorType.BOOLEAN ? (
                   <select 
                    value={formData.target as string}
                    onChange={e => updateField('target', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  >
                    <option value="">Select target state...</option>
                    <option value="true">{formData.booleanLabels?.true}</option>
                    <option value="false">{formData.booleanLabels?.false}</option>
                  </select>
                ) : (
                  <input 
                    type="number"
                    value={formData.target as number}
                    onChange={e => updateField('target', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md text-lg font-semibold"
                  />
                )}
             </div>

             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Baseline Value</label>
                {formData.type === IndicatorType.CATEGORICAL ? (
                   <select 
                    value={formData.baseline as string}
                    onChange={e => updateField('baseline', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  >
                    <option value="">Select baseline category...</option>
                    {formData.categories?.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                ) : formData.type === IndicatorType.BOOLEAN ? (
                   <select 
                    value={formData.baseline as string}
                    onChange={e => updateField('baseline', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  >
                    <option value="">Select baseline state...</option>
                    <option value="true">{formData.booleanLabels?.true}</option>
                    <option value="false">{formData.booleanLabels?.false}</option>
                  </select>
                ) : (
                   <input 
                    type="number"
                    value={formData.baseline as number}
                    onChange={e => updateField('baseline', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                   />
                )}
             </div>

             {/* Min/Max only for numbers */}
             {(formData.type === IndicatorType.NUMBER || formData.type === IndicatorType.PERCENTAGE || formData.type === IndicatorType.CURRENCY) && (
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Min Expected</label>
                    <input 
                      type="number"
                      value={formData.minExpected}
                      onChange={e => updateField('minExpected', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Max Expected</label>
                    <input 
                      type="number"
                      value={formData.maxExpected}
                      onChange={e => updateField('maxExpected', parseFloat(e.target.value))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md"
                    />
                  </div>
               </div>
             )}
          </div>
        );

      case 4: // Frequency
        return (
          <div className="max-w-2xl mx-auto space-y-6">
             <h2 className="text-xl font-bold text-slate-900 mb-2">Frequency & Period</h2>
             
             <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Reporting Frequency</label>
                <div className="flex items-center p-3 border border-blue-500 bg-blue-50 rounded-md">
                  <Calendar className="w-5 h-5 text-blue-600 mr-3" />
                  <div>
                    <span className="font-bold text-blue-900 block">Weekly</span>
                    <span className="text-xs text-blue-700">Data entry expected every week</span>
                  </div>
                  <div className="ml-auto">
                    <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">Fixed</span>
                  </div>
                </div>
             </div>

             <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Start Date (First Submission)</label>
               <input 
                 type="date"
                 className="w-full px-3 py-2 border border-slate-300 rounded-md"
                 defaultValue={new Date().toISOString().split('T')[0]}
               />
             </div>
          </div>
        );
      
      case 5: // Review
        return (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Review & Confirm</h2>
            
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                   <h3 className="font-semibold text-slate-700 flex items-center"><Layers className="w-4 h-4 mr-2" /> Context</h3>
                   <button onClick={() => setStep(0)} className="text-xs text-blue-600 hover:underline">Edit</button>
                </div>
                <div className="p-4">
                   <span className="text-sm text-slate-500 block mb-1">Selected Node</span>
                   <p className="font-medium text-slate-900">
                     {project.logframe.flatMap(n => [n, ...(n.children || []).flatMap(c => [c, ...(c.children || []).flatMap(cc => [cc, ...(cc.children || [])])])]).find(n => n.id === formData.nodeId)?.title || 'Unknown Node'}
                   </p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                   <h3 className="font-semibold text-slate-700 flex items-center"><Type className="w-4 h-4 mr-2" /> Definition</h3>
                   <button onClick={() => setStep(1)} className="text-xs text-blue-600 hover:underline">Edit</button>
                </div>
                <div className="p-4 space-y-2">
                   <div>
                     <span className="text-sm text-slate-500">Name:</span> <span className="font-medium">{formData.name}</span>
                   </div>
                   {formData.code && <div>
                     <span className="text-sm text-slate-500">Code:</span> <span className="font-medium font-mono bg-slate-100 px-1 rounded">{formData.code}</span>
                   </div>}
                   <p className="text-sm text-slate-600 mt-2 italic">{formData.description}</p>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                   <h3 className="font-semibold text-slate-700 flex items-center"><Target className="w-4 h-4 mr-2" /> Rules</h3>
                   <button onClick={() => setStep(3)} className="text-xs text-blue-600 hover:underline">Edit</button>
                </div>
                <div className="p-4 grid grid-cols-2 gap-4 text-sm">
                   <div><span className="text-slate-500">Type:</span> <span className="font-medium">{formData.type}</span></div>
                   <div><span className="text-slate-500">Target:</span> <span className="font-bold text-blue-600">{formData.target}</span></div>
                   <div><span className="text-slate-500">Baseline:</span> <span className="font-medium">{formData.baseline}</span></div>
                   <div><span className="text-slate-500">Frequency:</span> <span className="font-medium">{formData.frequency}</span></div>
                </div>
              </div>
            </div>
          </div>
        );

      default: return null;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Wizard Header */}
      <div className="bg-white pt-6 pb-2">
        <h1 className="text-2xl font-bold text-center text-slate-900">Set up Indicator</h1>
        <p className="text-center text-slate-500 mt-1">Define measurement rules for your logframe</p>
      </div>

      <WizardStepper steps={steps} currentStep={step} />

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 bg-white">
        {renderStepContent()}
      </div>

      {/* Sticky Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="secondary" onClick={handleBack}>
              Back
            </Button>
          )}
          <Button 
            onClick={handleNext} 
            disabled={!isStepValid() || isSubmitting}
            isLoading={isSubmitting}
            className="min-w-[120px]"
          >
            {step === steps.length - 1 ? 'Create Indicator' : 'Next'} 
            {step !== steps.length - 1 && <ChevronRight className="w-4 h-4 ml-2" />}
          </Button>
        </div>
      </div>
    </div>
  );
};