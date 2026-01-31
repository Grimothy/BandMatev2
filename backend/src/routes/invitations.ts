import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { hashPassword } from '../utils/password';
import { config } from '../config/env';
import {
  createInvitation,
  getInvitationByToken,
  getInvitationProjects,
  acceptInvitation,
  listPendingInvitations,
  revokeInvitation,
} from '../services/invitations';

const router = Router();
const prisma = new PrismaClient();

/**
 * Create a new invitation (admin only)
 * POST /api/invitations
 */
router.post('/', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { email, name, role, projectIds } = req.body;

    if (!email) {
      res.status(400).json({ error: 'Email is required' });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }

    const invitation = await createInvitation({
      email,
      name,
      role: role || 'MEMBER',
      projectIds: projectIds || [],
      invitedById: req.user!.id,
    });

    // Generate the invitation link
    const inviteLink = `${config.email.appUrl}/accept-invite?token=${invitation.token}`;

    res.status(201).json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        invitedBy: invitation.invitedBy,
        createdAt: invitation.createdAt,
      },
      inviteLink,
    });
  } catch (error) {
    console.error('Create invitation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to create invitation';
    res.status(400).json({ error: message });
  }
});

/**
 * List pending invitations (admin only)
 * GET /api/invitations
 */
router.get('/', authMiddleware, adminMiddleware, async (_req: Request, res: Response) => {
  try {
    const invitations = await listPendingInvitations();

    // Add invite links
    const result = invitations.map((inv) => ({
      id: inv.id,
      email: inv.email,
      name: inv.name,
      role: inv.role,
      expiresAt: inv.expiresAt,
      invitedBy: inv.invitedBy,
      createdAt: inv.createdAt,
      inviteLink: `${config.email.appUrl}/accept-invite?token=${inv.token}`,
    }));

    res.json({ invitations: result });
  } catch (error) {
    console.error('List invitations error:', error);
    res.status(500).json({ error: 'Failed to list invitations' });
  }
});

/**
 * Revoke an invitation (admin only)
 * DELETE /api/invitations/:id
 */
router.delete('/:id', authMiddleware, adminMiddleware, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await revokeInvitation(id);

    res.json({ message: 'Invitation revoked' });
  } catch (error) {
    console.error('Revoke invitation error:', error);
    res.status(500).json({ error: 'Failed to revoke invitation' });
  }
});

/**
 * Validate an invitation token (public)
 * GET /api/invitations/validate/:token
 */
router.get('/validate/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;

    const invitation = await getInvitationByToken(token);

    if (!invitation) {
      res.status(404).json({ error: 'Invalid or expired invitation' });
      return;
    }

    // Get project details
    const projects = await getInvitationProjects(invitation);

    res.json({
      invitation: {
        email: invitation.email,
        name: invitation.name,
        role: invitation.role,
        expiresAt: invitation.expiresAt,
        invitedBy: {
          name: invitation.invitedBy.name,
        },
        projects,
      },
    });
  } catch (error) {
    console.error('Validate invitation error:', error);
    res.status(500).json({ error: 'Failed to validate invitation' });
  }
});

/**
 * Accept an invitation with password (public)
 * POST /api/invitations/accept/:token
 */
router.post('/accept/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const { password, name } = req.body;

    if (!password) {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }

    // Validate invitation
    const invitation = await getInvitationByToken(token);

    if (!invitation) {
      res.status(404).json({ error: 'Invalid or expired invitation' });
      return;
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      res.status(400).json({ error: 'An account with this email already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        id: uuidv4(),
        email: invitation.email,
        password: hashedPassword,
        name: name || invitation.name || invitation.email.split('@')[0],
        role: invitation.role,
        authProvider: 'local',
      },
    });

    // Accept invitation (marks as used and adds to projects)
    await acceptInvitation(token, user.id);

    res.json({
      message: 'Account created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Accept invitation error:', error);
    const message = error instanceof Error ? error.message : 'Failed to accept invitation';
    res.status(400).json({ error: message });
  }
});

export default router;
