import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import './db.js';
import { seed } from './seed.js';
import { authenticate } from './middleware/auth.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import dashboardRoutes from './routes/dashboard.js';
import activityRoutes from './routes/activity.js';

if (seed()) console.log('Seeded database with demo data');

const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: config.clientOrigin.split(','), credentials: true }));
app.use(express.json({ limit: '1mb' }));
if (!config.isProd) app.use(morgan('dev'));

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticate, userRoutes);
app.use('/api/projects', authenticate, projectRoutes);
app.use('/api/tasks', authenticate, taskRoutes);
app.use('/api/dashboard', authenticate, dashboardRoutes);
app.use('/api/activity', authenticate, activityRoutes);
app.use('/api', notFoundHandler);

// Serve the built React app in production
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use(errorHandler);

app.listen(config.port, () => console.log(`TaskFlow API running on http://localhost:${config.port}`));
