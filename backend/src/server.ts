import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import adminRoutes from './routes/admin';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet());
app.use(cors()); // Consider restricting origin in production
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);

// Health & test routes
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'AccountForge API is running',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'AccountForge backend is working!',
    version: '1.0.0',
    mode: process.env.NODE_ENV
  });
});

// Centralized error handler
app.use((
  err: Error,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error' });
});

// 404 handler for /api/*
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Not Found', message: 'The requested endpoint does not exist' });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`AccountForge backend running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
  console.log(`Auth routes: http://localhost:${PORT}/api/auth`);
});

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed.');
    process.exit(0);
  });

  // Optional: Force shutdown after 10 seconds if close() hangs
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10_000);
};

// Handle termination signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown); // For Ctrl+C during local dev