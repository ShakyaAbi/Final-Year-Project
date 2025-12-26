
import React, { useState, useEffect } from 'react';
import { LogframeNode, NodeType } from '../types';
import { Button } from './ui/Button';

interface LogframeNodeFormProps {
  initialData?: Partial<LogframeNode>;
  parentType?: NodeType | null; // To determine allowed types
  mode: 'create' | 'edit';
  onSave: (data: Partial<LogframeNode>) => void;
  onCancel: () => void;
}

export const LogframeNodeForm: React.FC<LogframeNodeFormProps> = ({ 
  initialData, 
  parentType, 
  mode, 
  onSave, 
  onCancel 
}) => {
  const [formData, setFormData] = useState<Partial<LogframeNode>>({
    title: '',
    description: '',
    type: NodeType.GOAL,
    assumptions: '',
    risks: '',
    verificationMethod: '',
    ...initialData
  });

  // Determine allow types based on parent
  let allowedType = NodeType.GOAL;
  if (mode === 'create') {
    if (parentType === NodeType.GOAL) allowedType = NodeType.OUTCOME;
    else if (parentType === NodeType.OUTCOME) allowedType = NodeType.OUTPUT;
    else if (parentType === NodeType.OUTPUT) allowedType = NodeType.ACTIVITY;
  } else {
    // In edit mode, keep existing type
    allowedType = initialData?.type || NodeType.GOAL;
  }

  // Force type if creating new child
  useEffect(() => {
    if (mode === 'create') {
      setFormData(prev => ({ ...prev, type: allowedType }));
    }
  }, [mode, allowedType]);

  const handleChange = (field: keyof LogframeNode, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Node Type</label>
          <input 
            type="text" 
            disabled 
            value={formData.type} 
            className="w-full bg-slate-100 border border-slate-300 rounded-md px-3 py-2 text-sm text-slate-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input 
            type="text" 
            required
            value={formData.title || ''} 
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder={`e.g. ${allowedType === NodeType.ACTIVITY ? 'Train 50 staff' : 'Improved health outcomes'}`}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea 
            rows={3}
            value={formData.description || ''}
            onChange={(e) => handleChange('description', e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Verification Method</label>
          <textarea 
            rows={2}
            placeholder="Source of data or evidence"
            value={formData.verificationMethod || ''}
            onChange={(e) => handleChange('verificationMethod', e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Risks</label>
          <textarea 
            rows={2}
            placeholder="Potential external risks"
            value={formData.risks || ''}
            onChange={(e) => handleChange('risks', e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 mb-1">Assumptions</label>
          <textarea 
            rows={2}
            placeholder="Conditions necessary for success"
            value={formData.assumptions || ''}
            onChange={(e) => handleChange('assumptions', e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          {mode === 'create' ? 'Add Node' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
};
