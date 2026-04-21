import React from 'react';
import { render, screen } from '@testing-library/react';
import { LogframeTree } from '../components/LogframeTree';
import { NodeType } from '../types';

const node = { id: 'n1', type: NodeType.GOAL, title: 'Goal', children: [], indicatorCount: 0, description: '' } as any;

test('no action buttons when handlers absent', () => {
  render(<LogframeTree node={node} indicators={[]} />);
  expect(screen.queryByTitle('Add Indicator')).toBeNull();
  expect(screen.queryByTitle('Edit details')).toBeNull();
});
