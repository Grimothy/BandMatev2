import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/error';
import { cleanupExpiredTokens } from './services/auth';
import { initializeSocket } from './services/socket';
import { cleanupOldNotifications } from './services/notifications';

const app = express();
const httpServer = createServer(app);

// Initialize Socket.io
initializeSocket(httpServer);

// Middleware
app.use(cors({
  origin: config.nodeEnv === 'production' ? false : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve uploaded files
app.use('/uploads', express.static(path.resolve('./uploads')));

// API routes
app.use('/api', routes);

// In production, serve the frontend
if (config.nodeEnv === 'production') {
  const publicPath = path.resolve('./public');
  app.use(express.static(publicPath));
  
  // Handle client-side routing
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Cleanup expired tokens every hour
setInterval(() => {
  cleanupExpiredTokens().catch(console.error);
}, 60 * 60 * 1000);

// Cleanup old notifications daily
setInterval(() => {
  cleanupOldNotifications(30).catch(console.error);
}, 24 * 60 * 60 * 1000);

// Start server
httpServer.listen(config.port, () => {
  console.log(`BandMate server running on port ${config.port}`);
  console.log(`Environment: ${config.nodeEnv}`);
});

export default app;
