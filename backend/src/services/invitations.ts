import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { addUserToProjectRoom } from './socket';

const prisma = new PrismaClient();

const INVITATION_EXPIRY_DAYS = 7;

interface CreateInvitationParams {
  email: string;
  name?: string;
  role?: string;
  projectIds?: string[];
  invitedById: string;
}

/**
 * Generate a cryptographically secure invitation token
 */
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Create a new invitation
 */
export async function createInvitation({
  email,
  name,
  role = 'MEMBER',
  projectIds = [],
  invitedById,
}: CreateInvitationParams) {
  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new Error('A user with this email already exists');
  }

  // Check if there's already a pending invitation for this email
  const existingInvitation = await prisma.invitation.findFirst({
    where: {
      email,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (existingInvitation) {
    throw new Error('An invitation for this email is already pending');
  }

  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + INVITATION_EXPIRY_DAYS);

  const invitation = await prisma.invitation.create({
    data: {
      id: uuidv4(),
      token,
      email,
      name,
      role,
      projectIds: projectIds.length > 0 ? JSON.stringify(projectIds) : null,
      invitedById,
      expiresAt,
    },
    include: {
      invitedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return invitation;
}

/**
 * Get invitation by token (validates it's not expired or used)
 */
export async function getInvitationByToken(token: string) {
  const invitation = await prisma.invitation.findUnique({
    where: { token },
    include: {
      invitedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  if (!invitation) {
    return null;
  }

  // Check if expired
  if (invitation.expiresAt < new Date()) {
    return null;
  }

  // Check if already used
  if (invitation.acceptedAt) {
    return null;
  }

  return invitation;
}

/**
 * Get project details for invitation display
 */
export async function getInvitationProjects(invitation: { projectIds: string | null }) {
  if (!invitation.projectIds) {
    return [];
  }

  const projectIds = JSON.parse(invitation.projectIds) as string[];
  
  const projects = await prisma.project.findMany({
    where: { id: { in: projectIds } },
    select: { id: true, name: true, slug: true },
  });

  return projects;
}

/**
 * Accept an invitation and create the user account
 */
export async function acceptInvitation(
  token: string,
  userId: string
) {
  const invitation = await getInvitationByToken(token);

  if (!invitation) {
    throw new Error('Invalid or expired invitation');
  }

  // Mark invitation as accepted
  await prisma.invitation.update({
    where: { id: invitation.id },
    data: { acceptedAt: new Date() },
  });

  // Add user to projects if specified
  if (invitation.projectIds) {
    const projectIds = JSON.parse(invitation.projectIds) as string[];
    
    for (const projectId of projectIds) {
      // Check if project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (project) {
        // Add user to project (ignore if already a member)
        await prisma.projectMember.upsert({
          where: {
            userId_projectId: { userId, projectId },
          },
          create: {
            id: uuidv4(),
            userId,
            projectId,
            canCreateVibes: true,
          },
          update: {},
        });
        
        // Add user to project socket room for real-time updates
        addUserToProjectRoom(userId, projectId);
      }
    }
  }

  return invitation;
}

/**
 * List all pending invitations (for admin)
 */
export async function listPendingInvitations() {
  return prisma.invitation.findMany({
    where: {
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      invitedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Revoke (delete) an invitation
 */
export async function revokeInvitation(id: string) {
  return prisma.invitation.delete({
    where: { id },
  });
}

/**
 * Cleanup expired invitations (can be run periodically)
 */
export async function cleanupExpiredInvitations() {
  return prisma.invitation.deleteMany({
    where: {
      OR: [
        { expiresAt: { lt: new Date() } },
        { acceptedAt: { not: null } },
      ],
    },
  });
}
