import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import projectRoutes from './projects';
import vibeRoutes from './vibes';
import cutRoutes from './cuts';
import fileRoutes from './files';
import publicRoutes from './public';
import notificationRoutes from './notifications';
import invitationRoutes from './invitations';

const router = Router();

// Health check
router.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Public routes (no authentication required)
router.use('/public', publicRoutes);

// Mount routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/vibes', vibeRoutes);
router.use('/cuts', cutRoutes);
router.use('/files', fileRoutes);
router.use('/notifications', notificationRoutes);
router.use('/invitations', invitationRoutes);

export default router;
