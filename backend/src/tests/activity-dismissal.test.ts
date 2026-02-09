/**
 * Activity Dismissal Test
 * 
 * Verifies the functionality of dismissing activities:
 * 1. Dismissing an activity hides it from the user's feed
 * 2. Dismissed activities are excluded from unread counts
 * 3. Dismissal is independent per user
 * 4. Dismissing an activity doesn't delete it for other users
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

describe('Activity Dismissal', () => {
  let user1: { id: string; email: string; name: string; token: string };
  let user2: { id: string; email: string; name: string; token: string };
  let projectId: string;
  let activityId: string;

  beforeEach(async () => {
    // Clean up
    await prisma.activityRead.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();

    // Create users
    const password = await hashPassword('password123');
    
    const u1 = await prisma.user.create({
      data: { email: 'user1@test.com', password, name: 'User 1', role: 'ADMIN' }
    });
    const u2 = await prisma.user.create({
      data: { email: 'user2@test.com', password, name: 'User 2', role: 'MEMBER' }
    });

    // Login users
    const login1 = await request(app).post('/api/auth/login').send({ email: 'user1@test.com', password: 'password123' });
    const login2 = await request(app).post('/api/auth/login').send({ email: 'user2@test.com', password: 'password123' });

    user1 = { ...u1, token: login1.body.accessToken };
    user2 = { ...u2, token: login2.body.accessToken };

    // Create project and add both users
    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Cookie', `accessToken=${user1.token}`)
      .send({ name: 'Test Project' });
    
    expect(projectResponse.status).toBe(201);
    projectId = projectResponse.body.id;

    const addMemberResponse = await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', `accessToken=${user1.token}`)
      .send({ userId: user2.id });
    expect(addMemberResponse.status).toBe(201);

    // Create an activity (User 1 creates a vibe)
    const vibeResponse = await request(app)
      .post(`/api/vibes/project/${projectId}`)
      .set('Cookie', `accessToken=${user1.token}`)
      .send({ name: 'Test Vibe' });
    expect(vibeResponse.status).toBe(201);
    
    // Get the activity ID from user 2's feed
    const activitiesResponse = await request(app)
      .get('/api/activities')
      .set('Cookie', `accessToken=${user2.token}`);
    
    expect(activitiesResponse.status).toBe(200);
    expect(activitiesResponse.body.activities.length).toBeGreaterThan(0);
    activityId = activitiesResponse.body.activities[0].id;
  });

  it('should dismiss an activity and hide it from the feed', async () => {
    // Verify activity exists in user 2's feed
    const initialFeed = await request(app)
      .get('/api/activities')
      .set('Cookie', `accessToken=${user2.token}`);
    expect(initialFeed.body.activities.some((a: any) => a.id === activityId)).toBe(true);

    // Dismiss the activity
    const dismissResponse = await request(app)
      .delete(`/api/activities/${activityId}`)
      .set('Cookie', `accessToken=${user2.token}`);
    expect(dismissResponse.status).toBe(200);

    // Verify activity is gone from user 2's feed
    const updatedFeed = await request(app)
      .get('/api/activities')
      .set('Cookie', `accessToken=${user2.token}`);
    expect(updatedFeed.body.activities.some((a: any) => a.id === activityId)).toBe(false);
    expect(updatedFeed.body.total).toBe(initialFeed.body.total - 1);
  });

  it('should exclude dismissed activity from unread count', async () => {
    // Verify activity is unread for user 2
    const initialCount = await request(app)
      .get('/api/activities/unread-count')
      .set('Cookie', `accessToken=${user2.token}`);
    const countBefore = initialCount.body.count;
    expect(countBefore).toBeGreaterThan(0);

    // Dismiss the activity
    await request(app)
      .delete(`/api/activities/${activityId}`)
      .set('Cookie', `accessToken=${user2.token}`);

    // Verify unread count decreased
    const finalCount = await request(app)
      .get('/api/activities/unread-count')
      .set('Cookie', `accessToken=${user2.token}`);
    expect(finalCount.body.count).toBe(countBefore - 1);
  });

  it('dismissal should be independent per user', async () => {
    // User 2 dismisses the activity
    await request(app)
      .delete(`/api/activities/${activityId}`)
      .set('Cookie', `accessToken=${user2.token}`);

    // User 1 should still see the activity (User 1 created it, so it's their action)
    // Note: Activity service usually excludes user's own actions from their feed 
    // depending on the query. Let's create another activity by User 2 so User 1 can see it.
    
    const user2Vibe = await request(app)
      .post(`/api/vibes/project/${projectId}`)
      .set('Cookie', `accessToken=${user2.token}`)
      .send({ name: 'User 2 Vibe' });
    
    const user1Feed = await request(app)
      .get('/api/activities')
      .set('Cookie', `accessToken=${user1.token}`);
    
    const activity2Id = user1Feed.body.activities.find((a: any) => JSON.parse(a.metadata).vibeName === 'User 2 Vibe').id;

    // User 1 dismisses activity 2
    await request(app)
      .delete(`/api/activities/${activity2Id}`)
      .set('Cookie', `accessToken=${user1.token}`);
    
    // User 2 should still see activity 2
    const user2Feed = await request(app)
      .get('/api/activities')
      .set('Cookie', `accessToken=${user2.token}`);
    
    expect(user2Feed.body.activities.some((a: any) => a.id === activity2Id)).toBe(true);
  });

  it('should allow dismissing an already read activity', async () => {
    // Mark as read
    await request(app)
      .patch(`/api/activities/${activityId}/read`)
      .set('Cookie', `accessToken=${user2.token}`);
    
    // Dismiss
    const dismissResponse = await request(app)
      .delete(`/api/activities/${activityId}`)
      .set('Cookie', `accessToken=${user2.token}`);
    expect(dismissResponse.status).toBe(200);

    // Verify gone from feed
    const updatedFeed = await request(app)
      .get('/api/activities')
      .set('Cookie', `accessToken=${user2.token}`);
    expect(updatedFeed.body.activities.some((a: any) => a.id === activityId)).toBe(false);
  });
});
