import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { adminMiddleware } from '../middleware/admin';
import { uploadImage, deleteFile } from '../services/upload';
import { createProjectFolder, deleteProjectFolder } from '../services/folders';
import { generateUniqueSlug } from '../utils/slug';
import { createNotification } from '../services/notifications';
import path from 'path';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authMiddleware);

// List projects for current user (or all if admin)
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    
    let projects;
    if (user.role === 'ADMIN') {
      // Admins see all projects
      projects = await prisma.project.findMany({
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          vibes: {
            select: { id: true, name: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    } else {
      // Members only see their projects
      projects = await prisma.project.findMany({
        where: {
          members: {
            some: { userId: user.id },
          },
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          vibes: {
            select: { id: true, name: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });
    }

    res.json(projects);
  } catch (error) {
    console.error('List projects error:', error);
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// Get single project
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const projectId = req.params.id;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        vibes: {
          include: {
            cuts: {
              select: { id: true, name: true },
            },
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Check access
    if (user.role !== 'ADMIN') {
      const isMember = project.members.some((m) => m.userId === user.id);
      if (!isMember) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }
    }

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Failed to get project' });
  }
});

// Create project (admin only)
router.post('/', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Project name is required' });
      return;
    }

    // Get existing project slugs to ensure uniqueness
    const existingProjects = await prisma.project.findMany({
      select: { slug: true },
    });
    const existingSlugs = existingProjects.map(p => p.slug);
    const slug = generateUniqueSlug(name, existingSlugs);

    const project = await prisma.project.create({
      data: {
        name,
        slug,
      },
      include: {
        members: true,
        vibes: true,
      },
    });

    // Create the project folder
    try {
      await createProjectFolder(slug);
    } catch (e) {
      console.error('Failed to create project folder:', e);
    }

    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// Update project (admin only)
router.put('/:id', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;
    const projectId = req.params.id;

    const existing = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    const project = await prisma.project.update({
      where: { id: projectId },
      data: { name },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        vibes: true,
      },
    });

    res.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// Delete project (admin only)
router.delete('/:id', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.id;

    const existing = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Delete project image if exists
    if (existing.image) {
      try {
        await deleteFile(existing.image);
      } catch (e) {
        console.error('Failed to delete project image:', e);
      }
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    // Delete the project folder and all its contents
    try {
      await deleteProjectFolder(existing.slug);
    } catch (e) {
      console.error('Failed to delete project folder:', e);
    }

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// Upload project image (admin only)
router.post(
  '/:id/image',
  adminMiddleware,
  uploadImage.single('image'),
  async (req: AuthRequest, res: Response) => {
    try {
      const projectId = req.params.id;

      const existing = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!existing) {
        res.status(404).json({ error: 'Project not found' });
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

      const project = await prisma.project.update({
        where: { id: projectId },
        data: { image: imagePath },
      });

      res.json({ image: project.image });
    } catch (error) {
      console.error('Upload image error:', error);
      res.status(500).json({ error: 'Failed to upload image' });
    }
  }
);

// Add member to project (admin only)
router.post('/:id/members', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const projectId = req.params.id;
    const { userId, canCreateVibes } = req.body;

    if (!userId) {
      res.status(400).json({ error: 'User ID is required' });
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

    // Check user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Check if already a member
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });

    if (existingMember) {
      res.status(400).json({ error: 'User is already a member of this project' });
      return;
    }

    const member = await prisma.projectMember.create({
      data: {
        userId,
        projectId,
        canCreateVibes: canCreateVibes ?? true,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Send notification to the added user
    await createNotification({
      recipientId: userId,
      type: 'SUCCESS',
      title: 'Added to Project',
      message: `You have been added to the project "${project.name}".`,
      resourceLink: `/projects/${project.slug}`,
      sendEmail: true, // Always send email for project invites
    });

    res.status(201).json(member);
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// Remove member from project (admin only)
router.delete('/:id/members/:userId', adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id: projectId, userId } = req.params;

    const member = await prisma.projectMember.findUnique({
      where: {
        userId_projectId: {
          userId,
          projectId,
        },
      },
    });

    if (!member) {
      res.status(404).json({ error: 'Member not found' });
      return;
    }

    await prisma.projectMember.delete({
      where: { id: member.id },
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Remove member error:', error);
    res.status(500).json({ error: 'Failed to remove member' });
  }
});

export default router;
