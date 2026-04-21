import React, { useMemo, useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { LogframeNode } from '../types';

interface Props {
  isOpen: boolean;
  node: LogframeNode | null;
  indicators: any[];
  onClose: () => void;
  onSafeDelete: () => Promise<void>;
  onCascadeDelete: () => Promise<void>;
}

// Compute descendant nodes count from a node using its children tree
const countDescendants = (node: LogframeNode | null): number => {
  if (!node) return 0;
  let count = 0;
  const stack = [...(node.children || [])];
  while (stack.length) {
    const n = stack.pop()!;
    count += 1;
    if (n.children && n.children.length) stack.push(...n.children);
  }
  return count;
};

export const ConfirmCascadeModal: React.FC<Props> = ({ isOpen, node, indicators, onClose, onSafeDelete, onCascadeDelete }) => {
  const [confirmText, setConfirmText] = useState('');
  const descendants = useMemo(() => countDescendants(node), [node]);
  const indicatorCount = useMemo(() => {
    if (!node) return 0;
    return indicators.filter(i => i.nodeId === node.id).length;
  }, [node, indicators]);

  const canCascade = confirmText === 'CONFIRM';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={node ? `Delete "${node.title}"` : 'Delete node'}>
      <div className="space-y-4 p-4">
        <p className="text-sm text-slate-700">
          Deleting this node will remove it from the logframe. This action cannot be undone.
        </p>

        <div className="bg-slate-50 border border-slate-100 rounded p-3 text-sm text-slate-700">
          <div>Child nodes (descendants): <strong>{descendants}</strong></div>
          <div>Indicators attached to this node: <strong>{indicatorCount}</strong></div>
        </div>

        <div className="text-sm text-slate-600">
          <p className="mb-2">Options:</p>
          <ul className="list-disc pl-5">
            <li>Safe delete: Attempts to delete only this node. Will be blocked if this node has children or indicators.</li>
            <li className="mt-1">Cascade delete: Permanently remove this node and all its descendant nodes (and their indicators). Use with caution.</li>
          </ul>
        </div>

        <div className="space-y-2">
          <div>
            <label className="block text-xs text-slate-500 mb-1">Type <code>CONFIRM</code> to enable cascade delete</label>
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="w-full px-3 py-2 border rounded-xl" />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={async () => { await onSafeDelete(); }} variant="secondary">Safe delete</Button>
            <Button disabled={!canCascade} variant="danger" onClick={async () => { if (!canCascade) return; await onCascadeDelete(); }}>
              Cascade delete
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmCascadeModal;
