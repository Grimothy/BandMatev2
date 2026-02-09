/**
 * Cut Move Tests
 *
 * Tests for moving cuts between vibes within the same project.
 * Covers:
 * 1. Basic move functionality
 * 2. Access control (user must have access to both vibes)
 * 3. Same project validation (cannot move between projects)
 * 4. Slug collision handling
 * 5. Activity logging (cut_moved)
 * 6. Edge cases (already in target vibe, no files)
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

describe('Cut Move Between Vibes', () => {
  // Users
  let adminUser: { id: string; email: string; name: string };
  let memberUser: { id: string; email: string; name: string };
  // outsiderUser not needed - only token required for 403 tests

  // Auth tokens
  let adminToken: string;
  let memberToken: string;
  let outsiderToken: string;

  // Project resources
  let projectId: string;
  let projectSlug: string;
  let vibe1Id: string;
  let vibe1Slug: string;
  let vibe2Id: string;
  let vibe2Slug: string;
  let cutId: string;
  let cutSlug: string;

  beforeEach(async () => {
    // Clean up before each test (order matters due to foreign keys)
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
        email: 'admin@cutmove.test',
        password: adminHashedPassword,
        name: 'Admin User',
        role: 'ADMIN',
      },
    });
    adminUser = { id: admin.id, email: admin.email, name: admin.name };

    // Create member user
    const memberHashedPassword = await hashPassword('memberpass123');
    const member = await prisma.user.create({
      data: {
        email: 'member@cutmove.test',
        password: memberHashedPassword,
        name: 'Member User',
        role: 'MEMBER',
      },
    });
    memberUser = { id: member.id, email: member.email, name: member.name };

    // Create outsider user (no project access) - only token needed for 403 tests
    const outsiderHashedPassword = await hashPassword('outsiderpass123');
    await prisma.user.create({
      data: {
        email: 'outsider@cutmove.test',
        password: outsiderHashedPassword,
        name: 'Outsider User',
        role: 'MEMBER',
      },
    });

    // Login all users to get tokens
    const adminLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@cutmove.test', password: 'adminpass123' });
    adminToken = adminLoginResponse.body.accessToken;

    const memberLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'member@cutmove.test', password: 'memberpass123' });
    memberToken = memberLoginResponse.body.accessToken;

    const outsiderLoginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: 'outsider@cutmove.test', password: 'outsiderpass123' });
    outsiderToken = outsiderLoginResponse.body.accessToken;

    // Create project
    const projectResponse = await request(app)
      .post('/api/projects')
      .set('Cookie', `accessToken=${adminToken}`)
      .send({ name: 'Test Album' });
    projectId = projectResponse.body.id;
    projectSlug = projectResponse.body.slug;

    // Add member to project
    await request(app)
      .post(`/api/projects/${projectId}/members`)
      .set('Cookie', `accessToken=${adminToken}`)
      .send({ userId: memberUser.id, canCreateVibes: true });

    // Create vibe 1
    const vibe1Response = await request(app)
      .post(`/api/vibes/project/${projectId}`)
      .set('Cookie', `accessToken=${adminToken}`)
      .send({ name: 'Rock Vibe' });
    vibe1Id = vibe1Response.body.id;
    vibe1Slug = vibe1Response.body.slug;

    // Create vibe 2
    const vibe2Response = await request(app)
      .post(`/api/vibes/project/${projectId}`)
      .set('Cookie', `accessToken=${adminToken}`)
      .send({ name: 'Ballad Vibe' });
    vibe2Id = vibe2Response.body.id;
    vibe2Slug = vibe2Response.body.slug;

    // Create a cut in vibe 1
    const cutResponse = await request(app)
      .post(`/api/cuts/vibe/${vibe1Id}`)
      .set('Cookie', `accessToken=${adminToken}`)
      .send({ name: 'Demo Take 1' });
    cutId = cutResponse.body.id;
    cutSlug = cutResponse.body.slug;
  });

  describe('Basic Move Functionality', () => {
    it('should successfully move a cut to another vibe', async () => {
      const response = await request(app)
        .patch(`/api/cuts/${cutId}/move`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ targetVibeId: vibe2Id });

      expect(response.status).toBe(200);
      expect(response.body.vibeId).toBe(vibe2Id);
      expect(response.body.vibe.name).toBe('Ballad Vibe');
    });

    it('should remove the cut from the source vibe', async () => {
      // Move the cut
      await request(app)
        .patch(`/api/cuts/${cutId}/move`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ targetVibeId: vibe2Id });

      // Verify cut is no longer in vibe 1
      const vibe1Response = await request(app)
        .get(`/api/vibes/${vibe1Id}`)
        .set('Cookie', `accessToken=${adminToken}`);

      const cutsInVibe1 = vibe1Response.body.cuts || [];
      const movedCut = cutsInVibe1.find((c: any) => c.id === cutId);
      expect(movedCut).toBeUndefined();
    });

    it('should place the cut in the target vibe', async () => {
      // Move the cut
      await request(app)
        .patch(`/api/cuts/${cutId}/move`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ targetVibeId: vibe2Id });

      // Verify cut is now in vibe 2
      const vibe2Response = await request(app)
        .get(`/api/vibes/${vibe2Id}`)
        .set('Cookie', `accessToken=${adminToken}`);

      const cutsInVibe2 = vibe2Response.body.cuts || [];
      const movedCut = cutsInVibe2.find((c: any) => c.id === cutId);
      expect(movedCut).toBeDefined();
      expect(movedCut.name).toBe('Demo Take 1');
    });

    it('should append the cut to the end of the target vibe order', async () => {
      // Create another cut in vibe 2 first
      await request(app)
        .post(`/api/cuts/vibe/${vibe2Id}`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ name: 'Existing Cut' });

      // Move the cut
      const response = await request(app)
        .patch(`/api/cuts/${cutId}/move`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ targetVibeId: vibe2Id });

      expect(response.status).toBe(200);
      // The moved cut should have a higher order than existing cuts
      expect(response.body.order).toBeGreaterThan(0);
    });
  });

  describe('Access Control', () => {
    it('should reject unauthenticated requests', async () => {
      const response = await request(app)
        .patch(`/api/cuts/${cutId}/move`)
        .send({ targetVibeId: vibe2Id });

      expect(response.status).toBe(401);
    });

    it('should reject requests from users without project access', async () => {
      const response = await request(app)
        .patch(`/api/cuts/${cutId}/move`)
        .set('Cookie', `accessToken=${outsiderToken}`)
        .send({ targetVibeId: vibe2Id });

      expect(response.status).toBe(403);
    });

    it('should allow project members to move cuts', async () => {
      const response = await request(app)
        .patch(`/api/cuts/${cutId}/move`)
        .set('Cookie', `accessToken=${memberToken}`)
        .send({ targetVibeId: vibe2Id });

      expect(response.status).toBe(200);
      expect(response.body.vibeId).toBe(vibe2Id);
    });

    it('should allow project admin to move cuts', async () => {
      const response = await request(app)
        .patch(`/api/cuts/${cutId}/move`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ targetVibeId: vibe2Id });

      expect(response.status).toBe(200);
      expect(response.body.vibeId).toBe(vibe2Id);
    });
  });

  describe('Project Boundary Validation', () => {
    let otherProjectId: string;
    let otherVibeId: string;

    beforeEach(async () => {
      // Create a separate project
      const otherProjectResponse = await request(app)
        .post('/api/projects')
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ name: 'Other Album' });
      otherProjectId = otherProjectResponse.body.id;

      // Create a vibe in the other project
      const otherVibeResponse = await request(app)
        .post(`/api/vibes/project/${otherProjectId}`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ name: 'Other Vibe' });
      otherVibeId = otherVibeResponse.body.id;
    });

    it('should reject moving a cut to a vibe in a different project', async () => {
      const response = await request(app)
        .patch(`/api/cuts/${cutId}/move`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ targetVibeId: otherVibeId });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cannot move cuts between different projects');
    });
  });

  describe('Slug Collision Handling', () => {
    it('should generate a unique slug when target vibe has a cut with the same slug', async () => {
      // Create a cut with the same name in vibe 2
      await request(app)
        .post(`/api/cuts/vibe/${vibe2Id}`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ name: 'Demo Take 1' }); // Same name as the cut in vibe 1

      // Move the cut
      const response = await request(app)
        .patch(`/api/cuts/${cutId}/move`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ targetVibeId: vibe2Id });

      expect(response.status).toBe(200);
      expect(response.body.vibeId).toBe(vibe2Id);
      // Slug should be different from the original
      expect(response.body.slug).not.toBe(cutSlug);
    });
  });

  describe('Activity Logging', () => {
    it('should create a cut_moved activity when a cut is moved', async () => {
      // Move the cut
      await request(app)
        .patch(`/api/cuts/${cutId}/move`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ targetVibeId: vibe2Id });

      // Check activities
      const activitiesResponse = await request(app)
        .get('/api/activities')
        .set('Cookie', `accessToken=${adminToken}`);

      expect(activitiesResponse.status).toBe(200);

      const moveActivity = activitiesResponse.body.activities.find(
        (a: any) => a.type === 'cut_moved'
      );

      expect(moveActivity).toBeDefined();
      expect(moveActivity.user.name).toBe('Admin User');

      const metadata = JSON.parse(moveActivity.metadata);
      expect(metadata.cutName).toBe('Demo Take 1');
      expect(metadata.fromVibeName).toBe('Rock Vibe');
      expect(metadata.toVibeName).toBe('Ballad Vibe');
      expect(metadata.projectName).toBe('Test Album');
    });

    it('should include the correct resource link in the activity', async () => {
      // Move the cut
      await request(app)
        .patch(`/api/cuts/${cutId}/move`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ targetVibeId: vibe2Id });

      // Check activities
      const activitiesResponse = await request(app)
        .get('/api/activities')
        .set('Cookie', `accessToken=${adminToken}`);

      const moveActivity = activitiesResponse.body.activities.find(
        (a: any) => a.type === 'cut_moved'
      );

      expect(moveActivity.resourceLink).toContain(projectSlug);
      expect(moveActivity.resourceLink).toContain(vibe2Slug);
    });
  });

  describe('Edge Cases', () => {
    it('should reject moving a cut to the same vibe it is already in', async () => {
      const response = await request(app)
        .patch(`/api/cuts/${cutId}/move`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ targetVibeId: vibe1Id }); // Same vibe

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Cut is already in this vibe');
    });

    it('should reject request without targetVibeId', async () => {
      const response = await request(app)
        .patch(`/api/cuts/${cutId}/move`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Target vibe ID is required');
    });

    it('should return 404 for non-existent cut', async () => {
      const response = await request(app)
        .patch('/api/cuts/non-existent-id/move')
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ targetVibeId: vibe2Id });

      expect(response.status).toBe(404);
    });

    it('should return 404 for non-existent target vibe', async () => {
      const response = await request(app)
        .patch(`/api/cuts/${cutId}/move`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ targetVibeId: 'non-existent-vibe-id' });

      expect(response.status).toBe(404);
    });

    it('should handle cuts with no files gracefully', async () => {
      // The cut created in beforeEach has no files
      const response = await request(app)
        .patch(`/api/cuts/${cutId}/move`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ targetVibeId: vibe2Id });

      expect(response.status).toBe(200);
      expect(response.body.vibeId).toBe(vibe2Id);
    });
  });

  describe('Data Integrity After Move', () => {
    it('should preserve cut name after move', async () => {
      const response = await request(app)
        .patch(`/api/cuts/${cutId}/move`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ targetVibeId: vibe2Id });

      expect(response.status).toBe(200);
      expect(response.body.name).toBe('Demo Take 1');
    });

    it('should preserve cut metadata (bpm, timeSignature) after move', async () => {
      // Create a cut with metadata
      const cutWithMetaResponse = await request(app)
        .post(`/api/cuts/vibe/${vibe1Id}`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ name: 'Cut With Meta', bpm: 120, timeSignature: '4/4' });
      const cutWithMetaId = cutWithMetaResponse.body.id;

      // Move the cut
      const response = await request(app)
        .patch(`/api/cuts/${cutWithMetaId}/move`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ targetVibeId: vibe2Id });

      expect(response.status).toBe(200);

      // Verify metadata is preserved
      const cutResponse = await request(app)
        .get(`/api/cuts/${cutWithMetaId}`)
        .set('Cookie', `accessToken=${adminToken}`);

      expect(cutResponse.status).toBe(200);
      expect(cutResponse.body.bpm).toBe(120);
      expect(cutResponse.body.timeSignature).toBe('4/4');
    });

    it('should update the vibe reference in the response', async () => {
      const response = await request(app)
        .patch(`/api/cuts/${cutId}/move`)
        .set('Cookie', `accessToken=${adminToken}`)
        .send({ targetVibeId: vibe2Id });

      expect(response.status).toBe(200);
      expect(response.body.vibe).toBeDefined();
      expect(response.body.vibe.id).toBe(vibe2Id);
      expect(response.body.vibe.name).toBe('Ballad Vibe');
    });
  });
});
