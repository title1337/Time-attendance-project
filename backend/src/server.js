import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import leaveRoutes from './routes/leave.routes.js';
import overtimeRoutes from './routes/overtime.routes.js';

// ─── Validate required env vars at startup ────────────────────────────────────
const REQUIRED_ENV = ['JWT_SECRET', 'SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];

const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error(`❌ Missing environment variables: ${missing.join(', ')}`);
}

// ─── App setup ────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT ?? 5000;

// ─── Security Headers (Helmet) ────────────────────────────────────────────────
app.use(helmet());

// ─── Rate Limiting (Prevents Brute-force & DDoS) ──────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests, please try again later.' },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { success: false, message: 'Too many authentication attempts, please try again later.' },
});

app.use(globalLimiter);

// ─── CORS & Body Parsers ──────────────────────────────────────────────────────
const allowedOrigin = process.env.CLIENT_URL || '*';
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl) or if origin is allowed
      if (!origin || allowedOrigin === '*' || origin === allowedOrigin) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive for easy multi-domain deploy on Vercel
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({
    status: 'OK',
    service: 'Time Attendance API',
    timestamp: new Date().toISOString(),
  })
);

app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/overtime', overtimeRoutes);

// ─── 404 & Error handlers ─────────────────────────────────────────────────────
app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.originalUrl} not found` })
);

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Unhandled Server Error]', err);
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ─── Start Server if running directly (Local/Node) ────────────────────────────
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server  → http://localhost:${PORT}`);
    console.log(`📋 Health  → http://localhost:${PORT}/api/health`);
    console.log(`🌍 Env     → ${process.env.NODE_ENV}`);
  });
}

// Export app for Vercel Serverless Function
export default app;
