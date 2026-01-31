import dotenv from 'dotenv';

// Load .env file in development
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'dev-access-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
    accessExpiry: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@bandmate.local',
    password: process.env.ADMIN_PASSWORD || 'admin',
  },
  
  uploads: {
    images: process.env.UPLOADS_IMAGES_PATH || './uploads/images',
    audio: process.env.UPLOADS_AUDIO_PATH || './uploads/audio',
    stems: process.env.UPLOADS_STEMS_PATH || './uploads/stems',
  },

  email: {
    enabled: process.env.EMAIL_ENABLED === 'true',
    host: process.env.EMAIL_HOST || 'smtp.example.com',
    port: parseInt(process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true', // true for 465
    auth: {
      user: process.env.EMAIL_USER || '',
      pass: process.env.EMAIL_PASS || '',
    },
    from: process.env.EMAIL_FROM || 'BandMate <noreply@bandmate.local>',
    appUrl: process.env.APP_URL || 'http://localhost:5173',
  },
};
