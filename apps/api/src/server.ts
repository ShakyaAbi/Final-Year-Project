import app from './app';
import { config } from './config/env';
import { prisma } from './prisma';
import { startScheduler } from './jobs/scheduler';

const port = config.port;

async function start() {
  try {
    await prisma.$connect();
    
    // Start automated background jobs
    startScheduler();

    app.listen(port, () => {
      console.log(`MERLIN Lite API listening on port ${port}`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
}

start();
