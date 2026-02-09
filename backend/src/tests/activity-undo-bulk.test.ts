/**
 * Activity Undo and Bulk Dismissal Test
 * 
 * Verifies the functionality of:
 * 1. Undismissing an activity (Undo)
 * 2. Dismissing all activities (Bulk)
 */

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

describe('Activity Undo and Bulk Dismissal', () => {
  let user1: { id: string; email: string; name: string; token: string };
  let projectId: string;
  let activities: string[] = [];

  beforeEach(async () => {
    // Clean up
    await prisma.activityRead.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();

    // Create user
    const password = await hashPassword('password123');
    const u1 = await prisma.user.create({
      data: { email: 'user1@test.com', password, name: 'User 1', role: 'ADMIN' }
    });

    // Login user
    const login1 = await request(app).post('/api/auth/login').send({ email: 'user1@test.com', password: 'password123' });
    user1 = { ...u1, token: login1.body.accessToken };

    // Create project
    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Cookie', `accessToken=${user1.token}`)
      .send({ name: 'Test Project' });
    
    expect(projectResponse.status).toBe(201);
    projectId = projectResponse.body.id;
    expect(projectId).toBeDefined();

    // Create multiple activities (by another user so they show up in user1's feed)
    for (let i = 0; i < 3; i++) {
      await prisma.activity.create({
        data: {
          type: 'vibe_created',
          userId: user1.id,
          projectId,
          metadata: JSON.stringify({ vibeName: `Vibe ${i}` })
        }
      });
    }

    const res = await request(app)
      .get('/api/activities')
      .set('Cookie', `accessToken=${user1.token}`);
    activities = res.body.activities.map((a: any) => a.id);
  });

  it('should undismiss a previously dismissed activity', async () => {
    const activityId = activities[0];

    // 1. Dismiss
    await request(app)
      .delete(`/api/activities/${activityId}`)
      .set('Cookie', `accessToken=${user1.token}`);

    // Verify hidden
    let res = await request(app)
      .get('/api/activities')
      .set('Cookie', `accessToken=${user1.token}`);
    expect(res.body.activities.some((a: any) => a.id === activityId)).toBe(false);

    // 2. Undismiss
    const undismissRes = await request(app)
      .patch(`/api/activities/${activityId}/undismiss`)
      .set('Cookie', `accessToken=${user1.token}`);
    expect(undismissRes.status).toBe(200);

    // Verify restored
    res = await request(app)
      .get('/api/activities')
      .set('Cookie', `accessToken=${user1.token}`);
    expect(res.body.activities.some((a: any) => a.id === activityId)).toBe(true);
  });

  it('should dismiss all activities at once', async () => {
    // Verify we have activities
    let res = await request(app)
      .get('/api/activities')
      .set('Cookie', `accessToken=${user1.token}`);
    expect(res.body.activities.length).toBe(4);
    expect(res.body.total).toBe(4);

    // Dismiss all
    const dismissAllRes = await request(app)
      .delete('/api/activities')
      .set('Cookie', `accessToken=${user1.token}`);
    expect(dismissAllRes.status).toBe(200);
    expect(dismissAllRes.body.count).toBe(4);

    // Verify all hidden
    res = await request(app)
      .get('/api/activities')
      .set('Cookie', `accessToken=${user1.token}`);
    expect(res.body.activities.length).toBe(0);
    expect(res.body.total).toBe(0);
    expect(res.body.unreadCount).toBe(0);
  });

  it('dismiss all should not affect other users', async () => {
    // Create User 2
    const password = await hashPassword('password123');
    const u2 = await prisma.user.create({
      data: { email: 'user2@test.com', password, name: 'User 2', role: 'MEMBER' }
    });
    await prisma.projectMember.create({
      data: { projectId, userId: u2.id, canCreateVibes: true }
    });
    const login2 = await request(app).post('/api/auth/login').send({ email: 'user2@test.com', password: 'password123' });
    const user2Token = login2.body.accessToken;

    // User 1 dismisses all
    await request(app)
      .delete('/api/activities')
      .set('Cookie', `accessToken=${user1.token}`);

    // User 2 should still see everything
    const res = await request(app)
      .get('/api/activities')
      .set('Cookie', `accessToken=${user2Token}`);
    expect(res.body.activities.length).toBe(4);
  });
});
