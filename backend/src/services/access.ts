/**
 * Shared access control functions for checking user permissions on resources.
 * Consolidates duplicate access check logic from route files.
 */

import prisma from '../lib/prisma';

/**
 * Check if user has access to a project.
 * Admins have access to all projects; members must be in the project.
 */
export async function checkProjectAccess(
  userId: string,
  userRole: string,
  projectId: string
): Promise<boolean> {
  if (userRole === 'ADMIN') return true;

  const member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: { userId, projectId },
    },
  });

  return !!member;
}

/**
 * Check if user has access to a vibe's project.
 */
export async function checkVibeAccess(
  userId: string,
  userRole: string,
  vibeId: string
): Promise<boolean> {
  if (userRole === 'ADMIN') return true;

  const vibe = await prisma.vibe.findUnique({
    where: { id: vibeId },
    select: { projectId: true },
  });

  if (!vibe) return false;

  return checkProjectAccess(userId, userRole, vibe.projectId);
}

/**
 * Check if user has access to a cut's project.
 */
export async function checkCutAccess(
  userId: string,
  userRole: string,
  cutId: string
): Promise<boolean> {
  if (userRole === 'ADMIN') return true;

  const cut = await prisma.cut.findUnique({
    where: { id: cutId },
    include: {
      vibe: { select: { projectId: true } },
    },
  });

  if (!cut) return false;

  return checkProjectAccess(userId, userRole, cut.vibe.projectId);
}

/**
 * Check if user has access to a managed file's project.
 */
export async function checkFileAccess(
  userId: string,
  userRole: string,
  fileId: string
): Promise<boolean> {
  if (userRole === 'ADMIN') return true;

  const file = await prisma.managedFile.findUnique({
    where: { id: fileId },
    include: {
      cut: {
        include: {
          vibe: { select: { projectId: true } },
        },
      },
    },
  });

  if (!file) return false;

  return checkProjectAccess(userId, userRole, file.cut.vibe.projectId);
}

/**
 * Get the project ID for a given resource.
 * Useful when you need both access check and the projectId.
 */
export async function getProjectIdFromVibe(vibeId: string): Promise<string | null> {
  const vibe = await prisma.vibe.findUnique({
    where: { id: vibeId },
    select: { projectId: true },
  });
  return vibe?.projectId ?? null;
}

export async function getProjectIdFromCut(cutId: string): Promise<string | null> {
  const cut = await prisma.cut.findUnique({
    where: { id: cutId },
    include: {
      vibe: { select: { projectId: true } },
    },
  });
  return cut?.vibe.projectId ?? null;
}

export async function getProjectIdFromFile(fileId: string): Promise<string | null> {
  const file = await prisma.managedFile.findUnique({
    where: { id: fileId },
    include: {
      cut: {
        include: {
          vibe: { select: { projectId: true } },
        },
      },
    },
  });
  return file?.cut.vibe.projectId ?? null;
}
