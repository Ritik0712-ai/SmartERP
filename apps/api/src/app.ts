import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { requestLogger } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();

// Security & parsing
app.use(helmet());
app.use(
  cors({
    origin: env.corsOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limit on /api/*
const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later' },
  },
});
app.use(`/api/${env.apiVersion}`, apiLimiter);

// Logging
app.use(requestLogger);

// Health check
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      service: 'smarterp-api',
      env: env.nodeEnv,
      version: env.apiVersion,
      timestamp: new Date().toISOString(),
    },
  });
});

// API root
app.get(`/api/${env.apiVersion}`, (_req, res) => {
  res.json({
    success: true,
    data: {
      name: 'SmartERP API',
      version: env.apiVersion,
      docs: '/api/v1/docs',
    },
  });
});

// Module routes — wired in Day 2+
import { authRouter } from './modules/auth/auth.routes';
import { companyRouter } from './modules/company/company.routes';
app.use(`/api/${env.apiVersion}/auth`, authRouter);
app.use(`/api/${env.apiVersion}/companies`, companyRouter);
import { dashboardRouter } from './modules/dashboard/dashboard.routes';
app.use(`/api/${env.apiVersion}/dashboard`, dashboardRouter);
import { ledgerGroupRouter } from './modules/ledger-group/ledger-group.routes';
import { ledgerRouter } from './modules/ledger/ledger.routes';
import { customerRouter } from './modules/customer/customer.routes';
import { supplierRouter } from './modules/supplier/supplier.routes';
import { unitRouter } from './modules/unit/unit.routes';
import { stockGroupRouter } from './modules/stock-group/stock-group.routes';
import { stockItemRouter } from './modules/stock-item/stock-item.routes';
app.use(`/api/${env.apiVersion}/ledger-groups`, ledgerGroupRouter);
app.use(`/api/${env.apiVersion}/ledgers`, ledgerRouter);
app.use(`/api/${env.apiVersion}/customers`, customerRouter);
app.use(`/api/${env.apiVersion}/suppliers`, supplierRouter);
app.use(`/api/${env.apiVersion}/units`, unitRouter);
app.use(`/api/${env.apiVersion}/stock-groups`, stockGroupRouter);
app.use(`/api/${env.apiVersion}/stock-items`, stockItemRouter);

// 404 + error handler (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
