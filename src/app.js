import express from 'express';
import { createJobsRouter } from './routes/jobs.js';

export function createApp({ jobService }) {
  const app = express();

  app.use(express.json({ limit: '1mb' }));
  app.use(express.static('src/public'));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.use('/api/jobs', createJobsRouter({ jobService }));

  return app;
}
