import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import cookieParser from 'cookie-parser';
import routes from '../routes';
import { prisma } from './setup';
import { hashPassword } from '../utils/password';

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use('/api', routes);

describe('Auth Routes', () => {
  const testUser = {
    email: 'test@example.com',
    password: 'password123',
    name: 'Test User',
  };

  beforeEach(async () => {
    // Clean up before each test
    await prisma.refreshToken.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.user.deleteMany();
    
    // Create a test user with hashed password
    const hashedPassword = await hashPassword(testUser.password);
    await prisma.user.create({
      data: {
        email: testUser.email,
        password: hashedPassword,
        name: testUser.name,
        role: 'MEMBER',
      },
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      
      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe(testUser.email);
      expect(response.body.user.name).toBe(testUser.name);
      expect(response.body.accessToken).toBeDefined();
    });

    it('should reject invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: 'wrongpassword' });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should reject non-existent user', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nobody@example.com', password: 'password123' });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('should reject missing credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('should reject password login for OAuth-only user', async () => {
      // Create an OAuth-only user (no password)
      await prisma.user.create({
        data: {
          email: 'oauth@example.com',
          name: 'OAuth User',
          role: 'MEMBER',
          authProvider: 'google',
          providerId: 'google-12345',
          // No password set - this user only uses Google OAuth
        },
      });

      // Try to login with password
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email: 'oauth@example.com', password: 'anypassword' });
      
      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return user when authenticated', async () => {
      // First login to get token
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: testUser.email, password: testUser.password });
      
      const accessToken = loginResponse.body.accessToken;
      
      // Then get current user
      const response = await request(app)
        .get('/api/auth/me')
        .set('Cookie', `accessToken=${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe(testUser.email);
    });

    it('should reject unauthenticated request', async () => {
      const response = await request(app)
        .get('/api/auth/me');
      
      expect(response.status).toBe(401);
    });
  });
});
