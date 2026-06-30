import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { createServer } from 'http';
import { config } from './config/env';
import { logger } from './config/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestId } from './middleware/requestId';
import reportsRouter from './routes/reports';
import clustersRouter from './routes/clusters';
import departmentsRouter from './routes/departments';
import statsRouter from './routes/stats';
import adminRouter from './routes/admin';
import { startEscalationJob } from './jobs/escalation';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: config.frontendUrl,
  credentials: true,
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging & request ID
app.use(requestId);
app.use(pinoHttp({ logger }));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/reports', reportsRouter);
app.use('/api/clusters', clustersRouter);
app.use('/api/departments', departmentsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/admin', adminRouter);

// Error handling
app.use(errorHandler);

// Start server
const httpServer = createServer(app);
const PORT = config.port;

httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, `🚀 Hyperlocal Civic Tracker API running on port ${PORT}`);
  
  // Start background jobs
  if (config.nodeEnv === 'production' || config.nodeEnv === 'development') {
    startEscalationJob();
    logger.info('📅 Background jobs started');
  }
});

export default app;
