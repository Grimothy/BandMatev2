import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { uploadImage, deleteFile } from '../services/upload';
import { createVibeFolder, deleteVibeFolder } from '../services/folders';
import { generateUniqueSlug } from '../utils/slug';
import { createActivity } from '../services/activities';
import { checkProjectAccess } from '../services/access';
import prisma from '../lib/prisma';
import path from 'path';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// List vibes for a project
router.get('/project/:projectId', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { projectId } = req.params;

    // Check access
    const hasAccess = await checkProjectAccess(user.id, user.role, projectId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const vibes = await prisma.vibe.findMany({
      where: { projectId },
      include: {
        cuts: {
          select: { id: true, name: true },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json(vibes);
  } catch (error) {
    console.error('List vibes error:', error);
    res.status(500).json({ error: 'Failed to list vibes' });
  }
});

// Get single vibe
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const vibeId = req.params.id;

    const vibe = await prisma.vibe.findUnique({
      where: { id: vibeId },
      include: {
        project: {
          select: { id: true, name: true },
        },
        cuts: {
          include: {
            managedFiles: {
              where: { type: 'CUT' },
              select: {
                id: true,
                filename: true,
                originalName: true,
                path: true,
                duration: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!vibe) {
      res.status(404).json({ error: 'Vibe not found' });
      return;
    }

    // Check access
    const hasAccess = await checkProjectAccess(user.id, user.role, vibe.projectId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json(vibe);
  } catch (error) {
    console.error('Get vibe error:', error);
    res.status(500).json({ error: 'Failed to get vibe' });
  }
});

// Create vibe
router.post('/project/:projectId', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { projectId } = req.params;
    const { name, theme, notes } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Vibe name is required' });
      return;
    }

    // Check project exists
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check access and permission
    if (user.role !== 'ADMIN') {
      const member = await prisma.projectMember.findUnique({
        where: {
          userId_projectId: {
            userId: user.id,
            projectId,
          },
        },
      });

      if (!member) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      if (!member.canCreateVibes) {
        res.status(403).json({ error: 'You do not have permission to create vibes' });
        return;
      }
    }

    // Get existing vibe slugs within this project to ensure uniqueness
    const existingVibes = await prisma.vibe.findMany({
      where: { projectId },
      select: { slug: true },
    });
    const existingSlugs = existingVibes.map(v => v.slug);
    const slug = generateUniqueSlug(name, existingSlugs);

    const vibe = await prisma.vibe.create({
      data: {
        name,
        slug,
        theme,
        notes,
        projectId,
      },
      include: {
        cuts: true,
      },
    });

    // Create the vibe folder structure
    try {
      await createVibeFolder(project.slug, slug);
    } catch (e) {
      console.error('Failed to create vibe folder:', e);
    }

    // Create activity entry
    await createActivity({
      type: 'vibe_created',
      userId: user.id,
      projectId: project.id,
      metadata: {
        vibeName: name,
        projectName: project.name,
      },
      resourceLink: `/projects/${project.slug}/vibes/${slug}`,
    });

    res.status(201).json(vibe);
  } catch (error) {
    console.error('Create vibe error:', error);
    res.status(500).json({ error: 'Failed to create vibe' });
  }
});

// Update vibe
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const vibeId = req.params.id;
    const { name, theme, notes } = req.body;

    const existing = await prisma.vibe.findUnique({
      where: { id: vibeId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Vibe not found' });
      return;
    }

    // Check access
    const hasAccess = await checkProjectAccess(user.id, user.role, existing.projectId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const vibe = await prisma.vibe.update({
      where: { id: vibeId },
      data: {
        name: name ?? existing.name,
        theme: theme ?? existing.theme,
        notes: notes ?? existing.notes,
      },
      include: {
        cuts: true,
      },
    });

    res.json(vibe);
  } catch (error) {
    console.error('Update vibe error:', error);
    res.status(500).json({ error: 'Failed to update vibe' });
  }
});

// Delete vibe
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const vibeId = req.params.id;

    const existing = await prisma.vibe.findUnique({
      where: { id: vibeId },
      include: {
        project: {
          select: { slug: true },
        },
        cuts: {
          include: {
            managedFiles: true,
          },
        },
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Vibe not found' });
      return;
    }

    // Check access
    const hasAccess = await checkProjectAccess(user.id, user.role, existing.projectId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Delete all files
    for (const cut of existing.cuts) {
      for (const file of cut.managedFiles) {
        try {
          await deleteFile(file.path);
        } catch (e) {
          console.error('Failed to delete file:', e);
        }
      }
    }

    // Delete vibe image if exists
    if (existing.image) {
      try {
        await deleteFile(existing.image);
      } catch (e) {
        console.error('Failed to delete vibe image:', e);
      }
    }

    await prisma.vibe.delete({
      where: { id: vibeId },
    });

    // Delete the vibe folder and all its contents
    try {
      await deleteVibeFolder(existing.project.slug, existing.slug);
    } catch (e) {
      console.error('Failed to delete vibe folder:', e);
    }

    res.json({ message: 'Vibe deleted successfully' });
  } catch (error) {
    console.error('Delete vibe error:', error);
    res.status(500).json({ error: 'Failed to delete vibe' });
  }
});

// Upload vibe image
router.post(
  '/:id/image',
  uploadImage.single('image'),
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const vibeId = req.params.id;

      const existing = await prisma.vibe.findUnique({
        where: { id: vibeId },
      });

      if (!existing) {
        res.status(404).json({ error: 'Vibe not found' });
        return;
      }

      // Check access
      const hasAccess = await checkProjectAccess(user.id, user.role, existing.projectId);
      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No image file provided' });
        return;
      }

      // Delete old image if exists
      if (existing.image) {
        try {
          await deleteFile(existing.image);
        } catch (e) {
          console.error('Failed to delete old image:', e);
        }
      }

      const imagePath = path.join('uploads/images', req.file.filename);

      const vibe = await prisma.vibe.update({
        where: { id: vibeId },
        data: { image: imagePath },
      });

      res.json({ image: vibe.image });
    } catch (error) {
      console.error('Upload image error:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  }
);

export default router;
