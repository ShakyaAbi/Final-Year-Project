// Mock config early so importing server modules doesn't throw on missing env
jest.mock('../src/config/env', () => ({
  config: {
    env: 'test',
    port: 4000,
    appUrl: 'http://localhost:5173',
    jwtSecret: 'test',
    jwtExpiresIn: '1h',
    rateLimitEnabled: false,
    rateLimitWindowMs: 900000,
    rateLimitMax: 100,
    authDisabled: true,
    mlServiceUrl: '',
    mlServiceTimeoutMs: 5000,
    mlServiceApiKey: '',
    anomalyBackfillBatchSize: 100,
    smtp: { host: '', port: 587, user: '', pass: '', from: 'noreply@merlin.local' },
    reminderSchedulerEnabled: true,
    reminderCron: '*/5 * * * *',
    emailDryRun: true,
  },
}));

import cron from 'node-cron';
import * as scheduler from '../src/jobs/scheduler';

jest.mock('node-cron', () => ({
  schedule: jest.fn(() => ({
    start: jest.fn(),
    stop: jest.fn(),
    destroy: jest.fn(),
  })),
}));

describe('jobs/scheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('schedules reminder job using configured cron expression', () => {
    const mocked = cron.schedule as jest.Mock;
    scheduler.startScheduler();
    expect(mocked).toHaveBeenCalledWith('*/5 * * * *', expect.any(Function));
    // stop should call underlying stop()
    scheduler.stopScheduler();
    const scheduled = mocked.mock.results[0].value;
    expect(scheduled.stop).toHaveBeenCalled();
  });
});
