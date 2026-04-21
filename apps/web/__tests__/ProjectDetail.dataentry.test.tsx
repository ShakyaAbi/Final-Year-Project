import React from 'react';
import { render, screen } from '@testing-library/react';
import { ProjectDetail } from '../pages/ProjectDetail';
import * as api from '../services/api';

jest.mock('react-router-dom', () => ({
  ...(jest.requireActual('react-router-dom') as any),
  useParams: () => ({ id: 'p1' }),
}));

jest.spyOn(api, 'me' as any).mockResolvedValue({ role: 'DATA_ENTRY' });
jest.spyOn(api, 'getProject' as any).mockResolvedValue({ id: 'p1', name: 'P', logframe: [], startDate: null, endDate: null, description: '' });
jest.spyOn(api, 'getIndicators' as any).mockResolvedValue([]);
jest.spyOn(api, 'getProjectStats' as any).mockResolvedValue(null);
jest.spyOn(api, 'getProjectActivities' as any).mockResolvedValue([]);
jest.spyOn(api, 'getProjectAlerts' as any).mockResolvedValue([]);

test('hides edit/delete/add indicator for DATA_ENTRY', async () => {
  render(<ProjectDetail />);
  expect(await screen.findByText('P')).toBeInTheDocument();
  expect(screen.queryByText('Edit Project')).toBeNull();
  expect(screen.queryByText('Delete')).toBeNull();
  expect(screen.queryByText('Add Indicator')).toBeNull();
});
