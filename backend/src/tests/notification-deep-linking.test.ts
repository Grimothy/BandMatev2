/**
 * Notification Deep-Linking Test
 * 
 * This test verifies that notification resourceLinks correctly navigate users
 * to the appropriate location with proper query params for deep-linking.
 * 
 * The test verifies:
 * 1. All resourceLinks use ID-based paths (not slugs)
 * 2. Comment activities include ?tab=audio&comment=ID for direct navigation
 * 3. File upload activities include ?tab=audio for the audio tab
 * 4. Lyrics update activities include ?tab=lyrics for the lyrics tab
 * 5. Project/vibe activities link to project pages
 * 6. Cut activities link to cut pages with appropriate tabs
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

describe('Notification Deep-Linking', () => {
  let adminUser: { id: string; email: string; name: string };
  let member1User: { id: string; email: string; name: string };
  let member2User: { id: string; email: string; name: string };
  
  let adminToken: string;
  let member1Token: string;
  let member2Token: string;
  
  let projectId: string;
  let vibeId: string;
  let cutId: string;

  beforeEach(async () => {
    // Clean up before each test
    await prisma.activityRead.deleteMany();
    await prisma.activity.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.managedFile.deleteMany();
    await prisma.cut.deleteMany();
    await prisma.vibe.deleteMany();
    await prisma.projectMember.deleteMany();
    await prisma.project.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();

    // Create admin user
    const adminHashedPassword = await hashPassword('adminpass123');
    const admin = await prisma.user.create({
      data: {
        email: 'admin@test.com',
        password: adminHashedPassword,
        name: 'Admin User',
        role: 'ADMIN',
      },
    });
    adminUser = { id: admin.id, email: admin.email, name: admin.name };

    // Create member1
    const member1HashedPassword = await hashPassword('member1pass123');
    const member1 = await prisma.user.create({
      data: {
        email: 'member1@test.com',
        password: member1HashedPassword,
        name: 'Member One',
        role: 'MEMBER',
      },
    });
    member1User = { id: member1.id, email: member1.email, name: member1.name };

    // Create member2
    const member2HashedPassword = await hashPassword('member2pass123');
    const member2 = await prisma.user.create({
      data: {
        email: 'member2@test.com',
        password: member2HashedPassword,
        name: 'Member Two',
        role: 'MEMBER',
      },
    });
    member2User = { id: member2.id, email: member2.email, name: member2.name };

    // Login all users to get tokens
    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@test.com', password: 'adminpass123' });
    adminToken = adminLoginResponse.body.accessToken;

    const member1LoginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'member1@test.com', password: 'member1pass123' });
    member1Token = member1LoginResponse.body.accessToken;

    const member2LoginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'member2@test.com', password: 'member2pass123' });
    member2Token = member2LoginResponse.body.accessToken;
  });

  describe('Project Activity Links', () => {
    it('project_created should use ID-based path /projects/:id', async () => {
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ name: 'Test Album' });

      expect(projectResponse.status).toBe(201);
      projectId = projectResponse.body.id;

      const activitiesResponse = await request(app)
        .get('/api/activities')
        .set('Cookie', `accessToken=${adminToken}`);

      const projectActivity = activitiesResponse.body.activities.find(
        (a: any) => a.type === 'project_created'
      );

      expect(projectActivity).toBeDefined();
      expect(projectActivity.resourceLink).toBe(`/projects/${projectId}`);
      expect(projectActivity.resourceLink).not.toContain('slug');
    });

    it('member_added should use ID-based path /projects/:id', async () => {
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ name: 'Test Album' });

      projectId = projectResponse.body.id;

      await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ userId: member1User.id, canCreateVibes: true });

      const activitiesResponse = await request(app)
        .get('/api/activities')
        .set('Cookie', `accessToken=${adminToken}`);

      const memberActivity = activitiesResponse.body.activities.find(
        (a: any) => a.type === 'member_added'
      );

      expect(memberActivity).toBeDefined();
      expect(memberActivity.resourceLink).toBe(`/projects/${projectId}`);
    });
  });

  describe('Vibe Activity Links', () => {
    beforeEach(async () => {
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ name: 'Test Album' });
      projectId = projectResponse.body.id;

      await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ userId: member1User.id, canCreateVibes: true });
    });

    it('vibe_created should use project ID path /projects/:id', async () => {
      const vibeResponse = await request(app)
        .post(`/api/vibes/project/${projectId}`)
        .set('Cookie', `accessToken=${member1Token}`)
        .send({ name: 'Test Vibe' });

      expect(vibeResponse.status).toBe(201);

      const activitiesResponse = await request(app)
        .get('/api/activities')
        .set('Cookie', `accessToken=${adminToken}`);

      const vibeActivity = activitiesResponse.body.activities.find(
        (a: any) => a.type === 'vibe_created'
      );

      expect(vibeActivity).toBeDefined();
      expect(vibeActivity.resourceLink).toBe(`/projects/${projectId}`);
      expect(vibeActivity.resourceLink).not.toContain('vibes');
    });
  });

  describe('Cut Activity Links', () => {
    beforeEach(async () => {
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ name: 'Test Album' });
      projectId = projectResponse.body.id;

      await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ userId: member1User.id, canCreateVibes: true });

      const vibeResponse = await request(app)
        .post(`/api/vibes/project/${projectId}`)
        .set('Cookie', `accessToken=${member1Token}`)
        .send({ name: 'Test Vibe' });
      vibeId = vibeResponse.body.id;
    });

    it('cut_created should use cut ID path /cuts/:id', async () => {
      const cutResponse = await request(app)
        .post(`/api/cuts/vibe/${vibeId}`)
        .set('Cookie', `accessToken=${member1Token}`)
        .send({ name: 'Test Cut' });

      expect(cutResponse.status).toBe(201);
      cutId = cutResponse.body.id;

      const activitiesResponse = await request(app)
        .get('/api/activities')
        .set('Cookie', `accessToken=${adminToken}`);

      const cutActivity = activitiesResponse.body.activities.find(
        (a: any) => a.type === 'cut_created'
      );

      expect(cutActivity).toBeDefined();
      expect(cutActivity.resourceLink).toBe(`/cuts/${cutId}`);
      expect(cutActivity.resourceLink).not.toContain('projects');
      expect(cutActivity.resourceLink).not.toContain('vibes');
    });

    it('cut_moved should use cut ID path /cuts/:id', async () => {
      // Create initial cut
      const cutResponse = await request(app)
        .post(`/api/cuts/vibe/${vibeId}`)
        .set('Cookie', `accessToken=${member1Token}`)
        .send({ name: 'Test Cut' });

      cutId = cutResponse.body.id;

      // Create target vibe
      const targetVibeResponse = await request(app)
        .post(`/api/vibes/project/${projectId}`)
        .set('Cookie', `accessToken=${member1Token}`)
        .send({ name: 'Target Vibe' });

      const targetVibeId = targetVibeResponse.body.id;

      // Move cut
      await request(app)
        .patch(`/api/cuts/${cutId}/move`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ targetVibeId });

      const activitiesResponse = await request(app)
        .get('/api/activities')
        .set('Cookie', `accessToken=${adminToken}`);

      const moveActivity = activitiesResponse.body.activities.find(
        (a: any) => a.type === 'cut_moved'
      );

      expect(moveActivity).toBeDefined();
      expect(moveActivity.resourceLink).toBe(`/cuts/${cutId}`);
    });
  });

  describe('File Upload Activity Links', () => {
    beforeEach(async () => {
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ name: 'Test Album' });
      projectId = projectResponse.body.id;

      await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ userId: member1User.id, canCreateVibes: true });

      const vibeResponse = await request(app)
        .post(`/api/vibes/project/${projectId}`)
        .set('Cookie', `accessToken=${member1Token}`)
        .send({ name: 'Test Vibe' });
      vibeId = vibeResponse.body.id;

      const cutResponse = await request(app)
        .post(`/api/cuts/vibe/${vibeId}`)
        .set('Cookie', `accessToken=${member1Token}`)
        .send({ name: 'Test Cut' });
      cutId = cutResponse.body.id;
    });

    it('file_uploaded should use cut ID path with ?tab=audio query param', async () => {
      const uploadResponse = await request(app)
        .post(`/api/files/cut/${cutId}`)
        .set('Cookie', `accessToken=${member1Token}`)
        .field('name', 'Test Audio')
        .attach('file', Buffer.from('fake audio content'), 'test.mp3');

      expect(uploadResponse.status).toBe(201);

      const activitiesResponse = await request(app)
        .get('/api/activities')
        .set('Cookie', `accessToken=${adminToken}`);

      const uploadActivity = activitiesResponse.body.activities.find(
        (a: any) => a.type === 'file_uploaded'
      );

      expect(uploadActivity).toBeDefined();
      expect(uploadActivity.resourceLink).toBe(`/cuts/${cutId}?tab=audio`);
      expect(uploadActivity.resourceLink).toContain('?tab=audio');
    });
  });

  describe('Comment Activity Links', () => {
    let managedFileId: string;

    beforeEach(async () => {
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ name: 'Test Album' });
      projectId = projectResponse.body.id;

      await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ userId: member1User.id, canCreateVibes: true });

      const vibeResponse = await request(app)
        .post(`/api/vibes/project/${projectId}`)
        .set('Cookie', `accessToken=${member1Token}`)
        .send({ name: 'Test Vibe' });
      vibeId = vibeResponse.body.id;

      const cutResponse = await request(app)
        .post(`/api/cuts/vibe/${vibeId}`)
        .set('Cookie', `accessToken=${member1Token}`)
        .send({ name: 'Test Cut' });
      cutId = cutResponse.body.id;

      // Upload audio file
      const uploadResponse = await request(app)
        .post(`/api/files/cut/${cutId}`)
        .set('Cookie', `accessToken=${member1Token}`)
        .attach('file', Buffer.from('fake audio'), 'test.mp3');

      managedFileId = uploadResponse.body.id;
    });

    it('comment_added should use cut ID path with ?tab=audio&comment=ID query params', async () => {
      const commentResponse = await request(app)
        .post(`/api/cuts/${cutId}/comments`)
        .set('Cookie', `accessToken=${member1Token}`)
        .send({
          content: 'Great take!',
          timestamp: 30.5,
          audioFileId: managedFileId,
        });

      expect(commentResponse.status).toBe(201);
      const commentId = commentResponse.body.id;

      const activitiesResponse = await request(app)
        .get('/api/activities')
        .set('Cookie', `accessToken=${adminToken}`);

      const commentActivity = activitiesResponse.body.activities.find(
        (a: any) => a.type === 'comment_added'
      );

      expect(commentActivity).toBeDefined();
      expect(commentActivity.resourceLink).toBe(`/cuts/${cutId}?tab=audio&comment=${commentId}`);
      expect(commentActivity.resourceLink).toContain('?tab=audio&comment=');
      
      // Verify commentId is in metadata
      const metadata = JSON.parse(commentActivity.metadata);
      expect(metadata.commentId).toBe(commentId);
    });

    it('comment_added for reply should include parent commentId in metadata', async () => {
      // Create parent comment
      const parentCommentResponse = await request(app)
        .post(`/api/cuts/${cutId}/comments`)
        .set('Cookie', `accessToken=${member1Token}`)
        .send({
          content: 'Original comment',
          timestamp: 30.5,
          audioFileId: managedFileId,
        });

      const parentCommentId = parentCommentResponse.body.id;

      // Create reply
      const replyResponse = await request(app)
        .post(`/api/cuts/${cutId}/comments`)
        .set('Cookie', `accessToken=${member1Token}`)
        .send({
          content: 'Reply to comment',
          parentId: parentCommentId,
        });

      expect(replyResponse.status).toBe(201);
      const replyCommentId = replyResponse.body.id;

      const activitiesResponse = await request(app)
        .get('/api/activities')
        .set('Cookie', `accessToken=${adminToken}`);

      const replyActivity = activitiesResponse.body.activities.find(
        (a: any) => {
          const metadata = JSON.parse(a.metadata);
          return a.type === 'comment_added' && metadata.commentId === replyCommentId;
        }
      );

      expect(replyActivity).toBeDefined();
      expect(replyActivity.resourceLink).toBe(`/cuts/${cutId}?tab=audio&comment=${replyCommentId}`);
      
      const metadata = JSON.parse(replyActivity.metadata);
      expect(metadata.isReply).toBe(true);
      expect(metadata.commentId).toBe(replyCommentId);
    });
  });

  describe('Lyrics Update Activity Links', () => {
    beforeEach(async () => {
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ name: 'Test Album' });
      projectId = projectResponse.body.id;

      await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ userId: member1User.id, canCreateVibes: true });

      const vibeResponse = await request(app)
        .post(`/api/vibes/project/${projectId}`)
        .set('Cookie', `accessToken=${member1Token}`)
        .send({ name: 'Test Vibe' });
      vibeId = vibeResponse.body.id;

      const cutResponse = await request(app)
        .post(`/api/cuts/vibe/${vibeId}`)
        .set('Cookie', `accessToken=${member1Token}`)
        .send({ name: 'Test Cut' });
      cutId = cutResponse.body.id;
    });

    it('lyrics_updated should use cut ID path with ?tab=lyrics query param', async () => {
      const lyricsResponse = await request(app)
        .put(`/api/cuts/${cutId}/lyrics`)
        .set('Cookie', `accessToken=${member1Token}`)
        .send({
          lyrics: [
            {
              audioFileId: 'placeholder-id',
              lines: [
                { timestamp: 0, text: 'Verse 1 line 1' },
                { timestamp: 5, text: 'Verse 1 line 2' },
              ],
            },
          ],
        });

      expect(lyricsResponse.status).toBe(200);

      const activitiesResponse = await request(app)
        .get('/api/activities')
        .set('Cookie', `accessToken=${adminToken}`);

      const lyricsActivity = activitiesResponse.body.activities.find(
        (a: any) => a.type === 'lyrics_updated'
      );

      expect(lyricsActivity).toBeDefined();
      expect(lyricsActivity.resourceLink).toBe(`/cuts/${cutId}?tab=lyrics`);
      expect(lyricsActivity.resourceLink).toContain('?tab=lyrics');
    });
  });

  describe('No Slug-Based Paths', () => {
    beforeEach(async () => {
      const projectResponse = await request(app)
        .post('/api/projects')
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ name: 'Test Album' });
      projectId = projectResponse.body.id;

      await request(app)
        .post(`/api/projects/${projectId}/members`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ userId: member1User.id, canCreateVibes: true });

      const vibeResponse = await request(app)
        .post(`/api/vibes/project/${projectId}`)
        .set('Cookie', `accessToken=${member1Token}`)
        .send({ name: 'Test Vibe' });
      vibeId = vibeResponse.body.id;

      const cutResponse = await request(app)
        .post(`/api/cuts/vibe/${vibeId}`)
        .set('Cookie', `accessToken=${member1Token}`)
        .send({ name: 'Test Cut' });
      cutId = cutResponse.body.id;

      // Create file and comment
      const uploadResponse = await request(app)
        .post(`/api/files/cut/${cutId}`)
        .set('Cookie', `accessToken=${member1Token}`)
        .attach('file', Buffer.from('fake audio'), 'test.mp3');

      const managedFileId = uploadResponse.body.id;

      await request(app)
        .post(`/api/cuts/${cutId}/comments`)
        .set('Cookie', `accessToken=${member1Token}`)
        .send({
          content: 'Test comment',
          timestamp: 30,
          audioFileId: managedFileId,
        });
    });

    it('all resourceLinks should use IDs, not slugs', async () => {
      const activitiesResponse = await request(app)
        .get('/api/activities')
        .set('Cookie', `accessToken=${adminToken}`);

      const activities = activitiesResponse.body.activities;
      expect(activities.length).toBeGreaterThan(0);

      activities.forEach((activity: any) => {
        if (activity.resourceLink) {
          // Should not contain '/vibes/' pattern (vibes link to projects now)
          if (activity.type !== 'vibe_created') {
            expect(activity.resourceLink).not.toMatch(/\/vibes\/[\w-]+/);
          }
          
          // Should not contain '/projects/.../vibes/.../cuts/...' pattern
          expect(activity.resourceLink).not.toMatch(/\/projects\/[\w-]+\/vibes\/[\w-]+\/cuts\/[\w-]+/);
          
          // Project links should be /projects/:id
          if (activity.type === 'project_created' || activity.type === 'member_added' || activity.type === 'vibe_created') {
            expect(activity.resourceLink).toMatch(/^\/projects\/[\w-]+$/);
          }
          
          // Cut links should be /cuts/:id (with optional query params)
          if (['cut_created', 'cut_moved', 'file_uploaded', 'comment_added', 'lyrics_updated'].includes(activity.type)) {
            expect(activity.resourceLink).toMatch(/^\/cuts\/[\w-]+(\?.*)?$/);
          }
        }
      });
    });
  });
});
