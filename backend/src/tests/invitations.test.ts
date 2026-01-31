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

describe('Invitation Routes', () => {
  let adminToken: string;
  let adminUser: { id: string; email: string };
  let memberToken: string;

  beforeEach(async () => {
    // Clean up before each test
    await prisma.invitation.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.user.deleteMany();

    // Create an admin user
    const hashedPassword = await hashPassword('adminpass123');
    const admin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Admin User',
        role: 'ADMIN',
      },
    });
    adminUser = { id: admin.id, email: admin.email };

    // Create a regular member user
    const memberHashedPassword = await hashPassword('memberpass123');
    await prisma.user.create({
      data: {
        email: 'member@example.com',
        password: memberHashedPassword,
        name: 'Member User',
        role: 'MEMBER',
      },
    });

    // Login as admin to get token
    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@example.com', password: 'adminpass123' });
    adminToken = adminLoginResponse.body.accessToken;

    // Login as member to get token
    const memberLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'member@example.com', password: 'memberpass123' });
    memberToken = memberLoginResponse.body.accessToken;
  });

  describe('POST /api/invitations (Create invitation)', () => {
    it('should allow admin to create an invitation', async () => {
      const response = await request(app)
        .post('/api/invitations')
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ email: 'newuser@example.com', name: 'New User' });

      expect(response.status).toBe(201);
      expect(response.body.invitation.email).toBe('newuser@example.com');
      expect(response.body.invitation.name).toBe('New User');
      expect(response.body.inviteLink).toContain('/accept-invite?token=');
    });

    it('should reject non-admin from creating invitation', async () => {
      const response = await request(app)
        .post('/api/invitations')
        .set('Cookie', `accessToken=${memberToken}`)
        .send({ email: 'newuser@example.com' });

      expect(response.status).toBe(403);
    });

    it('should reject invitation for existing user', async () => {
      const response = await request(app)
        .post('/api/invitations')
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ email: 'member@example.com' }); // Already exists

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already exists');
    });

    it('should reject duplicate pending invitation', async () => {
      // Create first invitation
      await request(app)
        .post('/api/invitations')
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ email: 'newuser@example.com' });

      // Try to create another for same email
      const response = await request(app)
        .post('/api/invitations')
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ email: 'newuser@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('already pending');
    });
  });

  describe('GET /api/invitations/validate/:token (Validate token)', () => {
    it('should validate a valid token', async () => {
      // Create invitation
      const createResponse = await request(app)
        .post('/api/invitations')
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ email: 'newuser@example.com', name: 'New User' });

      // Extract token from invite link
      const inviteLink = createResponse.body.inviteLink;
      const token = inviteLink.split('token=')[1];

      // Validate token
      const response = await request(app)
        .get(`/api/invitations/validate/${token}`);

      expect(response.status).toBe(200);
      expect(response.body.invitation.email).toBe('newuser@example.com');
      expect(response.body.invitation.invitedBy.name).toBe('Admin User');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .get('/api/invitations/validate/invalid-token-12345');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Invalid or expired');
    });
  });

  describe('POST /api/invitations/accept/:token (Accept invitation)', () => {
    it('should accept invitation with valid password', async () => {
      // Create invitation
      const createResponse = await request(app)
        .post('/api/invitations')
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ email: 'newuser@example.com', name: 'New User' });

      const token = createResponse.body.inviteLink.split('token=')[1];

      // Accept invitation
      const response = await request(app)
        .post(`/api/invitations/accept/${token}`)
        .send({ password: 'securepassword123', name: 'New User' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Account created successfully');
      expect(response.body.user.email).toBe('newuser@example.com');
      expect(response.body.user.name).toBe('New User');

      // Verify user can login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({ email: 'newuser@example.com', password: 'securepassword123' });

      expect(loginResponse.status).toBe(200);
    });

    it('should reject short password', async () => {
      // Create invitation
      const createResponse = await request(app)
        .post('/api/invitations')
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ email: 'newuser@example.com' });

      const token = createResponse.body.inviteLink.split('token=')[1];

      // Try to accept with short password
      const response = await request(app)
        .post(`/api/invitations/accept/${token}`)
        .send({ password: 'short' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('at least 8 characters');
    });

    it('should reject already used token', async () => {
      // Create invitation
      const createResponse = await request(app)
        .post('/api/invitations')
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ email: 'newuser@example.com' });

      const token = createResponse.body.inviteLink.split('token=')[1];

      // Accept invitation first time
      await request(app)
        .post(`/api/invitations/accept/${token}`)
        .send({ password: 'securepassword123' });

      // Try to use token again
      const response = await request(app)
        .post(`/api/invitations/accept/${token}`)
        .send({ password: 'anotherpassword123' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Invalid or expired');
    });

    it('should reject invalid token', async () => {
      const response = await request(app)
        .post('/api/invitations/accept/invalid-token-12345')
        .send({ password: 'securepassword123' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('Invalid or expired');
    });
  });

  describe('DELETE /api/invitations/:id (Revoke invitation)', () => {
    it('should allow admin to revoke invitation', async () => {
      // Create invitation
      const createResponse = await request(app)
        .post('/api/invitations')
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ email: 'newuser@example.com' });

      const invitationId = createResponse.body.invitation.id;
      const token = createResponse.body.inviteLink.split('token=')[1];

      // Revoke invitation
      const revokeResponse = await request(app)
        .delete(`/api/invitations/${invitationId}`)
        .set('Cookie', `accessToken=${adminToken}`);

      expect(revokeResponse.status).toBe(200);

      // Verify token is no longer valid
      const validateResponse = await request(app)
        .get(`/api/invitations/validate/${token}`);

      expect(validateResponse.status).toBe(404);
    });
  });
});
