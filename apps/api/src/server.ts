import app from './app';
import { config } from './config/env';
import { prisma } from './prisma';
import { startScheduler, stopScheduler } from './jobs/scheduler';

const port = config.port;

async function start() {
  try {
    await prisma.$connect();

    // Start automated background jobs (if enabled)
    if (config.reminderSchedulerEnabled) startScheduler();

    const server = app.listen(port, () => {
      console.log(`MERLIN Lite API listening on port ${port}`);
    });

    const shutdown = async (signal: string) => {
      console.log(`Received ${signal}, shutting down...`);
      try {
        await stopScheduler();
        server.close(() => console.log('HTTP server closed'));
        await prisma.$disconnect();
        process.exit(0);
      } catch (err) {
        console.error('Error during shutdown', err);
        process.exit(1);
      }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
