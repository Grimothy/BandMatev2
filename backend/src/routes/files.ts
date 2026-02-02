import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { deleteFile, uploadCutAudio, uploadCutStem, getCutAudioFilePath, getCutStemFilePath } from '../services/upload';
import { createBulkNotifications } from '../services/notifications';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authMiddleware);

// Get available projects, vibes, and cuts for filter dropdowns
// IMPORTANT: This route MUST be defined before /:id to avoid "meta" being treated as an id
router.get('/meta/hierarchy', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;

    let projects;
    
    if (user.role === 'ADMIN') {
      projects = await prisma.project.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          image: true,
          vibes: {
            select: {
              id: true,
              name: true,
              slug: true,
              image: true,
              cuts: {
                select: { id: true, name: true, slug: true },
              },
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    } else {
      const userProjects = await prisma.projectMember.findMany({
        where: { userId: user.id },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
              image: true,
              vibes: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  image: true,
                  cuts: {
                    select: { id: true, name: true, slug: true },
                  },
                },
              },
            },
          },
        },
      });
      
      projects = userProjects.map(pm => pm.project);
    }

    res.json(projects);
  } catch (error) {
    console.error('Get hierarchy error:', error);
    res.status(500).json({ error: 'Failed to get hierarchy' });
  }
});

// Get storage usage for the current user
// IMPORTANT: This route MUST be defined before /:id to avoid "storage" being treated as an id
router.get('/storage', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const isAdmin = user.role === 'ADMIN';

    // Admins see all files, users see only their own uploads
    const whereClause = isAdmin ? {} : { uploadedById: user.id };

    // Get total storage used
    const totalResult = await prisma.managedFile.aggregate({
      where: whereClause,
      _sum: { fileSize: true },
    });

    // Get storage breakdown by file type
    const byTypeResult = await prisma.managedFile.groupBy({
      by: ['type'],
      where: whereClause,
      _sum: { fileSize: true },
    });

    const breakdown: Record<string, number> = {
      CUT: 0,
      STEM: 0,
    };

    byTypeResult.forEach(item => {
      breakdown[item.type] = item._sum.fileSize || 0;
    });

    // Get file count
    const fileCount = await prisma.managedFile.count({
      where: whereClause,
    });

    res.json({
      totalUsed: totalResult._sum.fileSize || 0,
      byType: breakdown,
      fileCount,
    });
  } catch (error) {
    console.error('Get storage error:', error);
    res.status(500).json({ error: 'Failed to get storage info' });
  }
});

// Helper to check project access via cut
async function checkCutAccess(userId: string, userRole: string, cutId: string): Promise<boolean> {
  if (userRole === 'ADMIN') return true;
  
  const cut = await prisma.cut.findUnique({
    where: { id: cutId },
    include: {
      vibe: {
        select: { projectId: true },
      },
    },
  });
  
  if (!cut) return false;
  
  const member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId: cut.vibe.projectId,
      },
    },
  });
  
  return !!member;
}

// Helper to check project access via managed file
async function checkFileAccess(userId: string, userRole: string, fileId: string): Promise<boolean> {
  if (userRole === 'ADMIN') return true;
  
  const file = await prisma.managedFile.findUnique({
    where: { id: fileId },
    include: {
      cut: {
        include: {
          vibe: {
            select: { projectId: true },
          },
        },
      },
    },
  });
  
  if (!file) return false;
  
  const member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId: file.cut.vibe.projectId,
      },
    },
  });
  
  return !!member;
}

// List all managed files with filtering and sorting
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { projectId, vibeId, cutId, type, sort = 'createdAt', order = 'desc' } = req.query;

    // Build where clause
    const where: any = {};
    
    if (cutId) {
      where.cutId = cutId as string;
    }
    
    if (type) {
      where.type = type as string;
    }

    // If filtering by vibe, get all cuts for that vibe first
    if (vibeId && !cutId) {
      const cuts = await prisma.cut.findMany({
        where: { vibeId: vibeId as string },
        select: { id: true },
      });
      where.cutId = { in: cuts.map(c => c.id) };
    }

    // If filtering by project, get all cuts for all vibes in that project
    if (projectId && !vibeId && !cutId) {
      const vibes = await prisma.vibe.findMany({
        where: { projectId: projectId as string },
        select: { id: true },
      });
      const cuts = await prisma.cut.findMany({
        where: { vibeId: { in: vibes.map(v => v.id) } },
        select: { id: true },
      });
      where.cutId = { in: cuts.map(c => c.id) };
    }

    // For non-admin users, filter to only accessible files
    if (user.role !== 'ADMIN') {
      const userProjects = await prisma.projectMember.findMany({
        where: { userId: user.id },
        select: { projectId: true },
      });
      
      const projectIds = userProjects.map(p => p.projectId);
      
      const accessibleVibes = await prisma.vibe.findMany({
        where: { projectId: { in: projectIds } },
        select: { id: true },
      });
      
      const accessibleCuts = await prisma.cut.findMany({
        where: { vibeId: { in: accessibleVibes.map(v => v.id) } },
        select: { id: true },
      });
      
      const accessibleCutIds = accessibleCuts.map(c => c.id);
      
      // Intersect with existing cutId filter if present
      if (where.cutId) {
        if (typeof where.cutId === 'string') {
          if (!accessibleCutIds.includes(where.cutId)) {
            res.json([]);
            return;
          }
        } else if (where.cutId.in) {
          where.cutId.in = where.cutId.in.filter((id: string) => accessibleCutIds.includes(id));
        }
      } else {
        where.cutId = { in: accessibleCutIds };
      }
    }

    // Build orderBy
    const validSortFields = ['createdAt', 'name', 'originalName', 'fileSize', 'type'];
    const sortField = validSortFields.includes(sort as string) ? sort as string : 'createdAt';
    const sortOrder = order === 'asc' ? 'asc' : 'desc';

    const files = await prisma.managedFile.findMany({
      where,
      include: {
        uploadedBy: {
          select: { id: true, name: true },
        },
        cut: {
          include: {
            vibe: {
              include: {
                project: {
                  select: { id: true, name: true, slug: true },
                },
              },
            },
          },
        },
      },
      orderBy: { [sortField]: sortOrder },
    });

    res.json(files);
  } catch (error) {
    console.error('List files error:', error);
    res.status(500).json({ error: 'Failed to list files' });
  }
});

// Get single file
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const fileId = req.params.id;

    const file = await prisma.managedFile.findUnique({
      where: { id: fileId },
      include: {
        uploadedBy: {
          select: { id: true, name: true },
        },
        cut: {
          include: {
            vibe: {
              include: {
                project: {
                  select: { id: true, name: true, slug: true },
                },
              },
            },
          },
        },
      },
    });

    if (!file) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Check access
    const hasAccess = await checkFileAccess(user.id, user.role, fileId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json(file);
  } catch (error) {
    console.error('Get file error:', error);
    res.status(500).json({ error: 'Failed to get file' });
  }
});

// Middleware to prepare file upload with slug info
// Uses cutId from URL params (not body) since body isn't parsed yet for multipart
const prepareFileUpload = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const cutId = req.params.cutId;

    if (!cutId) {
      res.status(400).json({ error: 'Cut ID is required' });
      return;
    }

    const cut = await prisma.cut.findUnique({
      where: { id: cutId },
      include: {
        vibe: {
          include: {
            project: {
              select: { slug: true },
            },
          },
        },
      },
    });

    if (!cut) {
      res.status(404).json({ error: 'Cut not found' });
      return;
    }

    // Check access
    const user = req.user!;
    const hasAccess = await checkCutAccess(user.id, user.role, cutId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Set upload context for multer storage (NOT on req.body which gets overwritten)
    (req as any).uploadContext = {
      projectSlug: cut.vibe.project.slug,
      vibeSlug: cut.vibe.slug,
      cutSlug: cut.slug,
    };
    
    // Store cut info for later use in handler
    (req as any).cutData = cut;
    
    next();
  } catch (error) {
    console.error('Prepare file upload error:', error);
    res.status(500).json({ error: 'Failed to prepare upload' });
  }
};

// Upload a cut (audio file)
router.post(
  '/cut/:cutId',
  prepareFileUpload,
  uploadCutAudio.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { cutId } = req.params;
      const { name } = req.body;
      const cut = (req as any).cutData;

      if (!req.file) {
        res.status(400).json({ error: 'No audio file provided' });
        return;
      }

      const filePath = getCutAudioFilePath(
        cut.vibe.project.slug,
        cut.vibe.slug,
        cut.slug,
        req.file.filename
      );

      // Create ManagedFile with type="CUT" for audio
      const managedFile = await prisma.managedFile.create({
        data: {
          name: name || null,
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: filePath,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          type: 'CUT',
          cutId,
          uploadedById: user.id,
        },
        include: {
          uploadedBy: {
            select: { id: true, name: true },
          },
          cut: {
            include: {
              vibe: {
                include: {
                  project: {
                    select: { id: true, name: true, slug: true },
                  },
                },
              },
            },
          },
        },
      });

      // Notify other project members about the new file upload
      const projectMembers = await prisma.projectMember.findMany({
        where: {
          projectId: cut.vibe.projectId,
          userId: { not: user.id }, // Exclude the uploader
        },
        select: { userId: true },
      });

      if (projectMembers.length > 0) {
        const recipientIds = projectMembers.map(m => m.userId);
        await createBulkNotifications(recipientIds, {
          type: 'INFO',
          title: 'New Audio Uploaded',
          message: `${user.name} uploaded a new audio file "${req.file.originalname}" to ${cut.name}.`,
          resourceLink: `/projects/${cut.vibe.project.slug}/vibes/${cut.vibe.slug}/cuts/${cut.slug}`,
        });
      }

      res.status(201).json(managedFile);
    } catch (error) {
      console.error('Upload cut error:', error);
      res.status(500).json({ error: 'Failed to upload cut' });
    }
  }
);

// Upload a stem (zip file)
router.post(
  '/stem/:cutId',
  prepareFileUpload,
  uploadCutStem.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const { cutId } = req.params;
      const { name } = req.body;
      const cut = (req as any).cutData;

      if (!req.file) {
        res.status(400).json({ error: 'No zip file provided' });
        return;
      }

      const filePath = getCutStemFilePath(
        cut.vibe.project.slug,
        cut.vibe.slug,
        cut.slug,
        req.file.filename
      );

      const managedFile = await prisma.managedFile.create({
        data: {
          name: name || null,
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: filePath,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          type: 'STEM',
          cutId,
          uploadedById: user.id,
        },
        include: {
          uploadedBy: {
            select: { id: true, name: true },
          },
          cut: {
            include: {
              vibe: {
                include: {
                  project: {
                    select: { id: true, name: true, slug: true },
                  },
                },
              },
            },
          },
        },
      });

      res.status(201).json(managedFile);
    } catch (error) {
      console.error('Upload stem error:', error);
      res.status(500).json({ error: 'Failed to upload stem' });
    }
  }
);

// Update file metadata (only name can be updated - cutId is immutable)
router.patch('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const fileId = req.params.id;
    const { name } = req.body;

    const existing = await prisma.managedFile.findUnique({
      where: { id: fileId },
    });

    if (!existing) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Check access
    const hasAccess = await checkFileAccess(user.id, user.role, fileId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Only file owner or admin can modify
    if (existing.uploadedById !== user.id && user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only file owner or admin can modify this file' });
      return;
    }

    const updated = await prisma.managedFile.update({
      where: { id: fileId },
      data: {
        name: name !== undefined ? (name || null) : existing.name,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true },
        },
        cut: {
          include: {
            vibe: {
              include: {
                project: {
                  select: { id: true, name: true, slug: true },
                },
              },
            },
          },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update file error:', error);
    res.status(500).json({ error: 'Failed to update file' });
  }
});

// Delete file
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const fileId = req.params.id;

    const existing = await prisma.managedFile.findUnique({
      where: { id: fileId },
    });

    if (!existing) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Check access
    const hasAccess = await checkFileAccess(user.id, user.role, fileId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Only file owner or admin can delete
    if (existing.uploadedById !== user.id && user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only file owner or admin can delete this file' });
      return;
    }

    // Delete file from disk
    try {
      await deleteFile(existing.path);
    } catch (e) {
      console.error('Failed to delete file from disk:', e);
    }

    // Delete from ManagedFile table
    await prisma.managedFile.delete({
      where: { id: fileId },
    });

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// Share file publicly
router.post('/:id/share', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const fileId = req.params.id;

    const existing = await prisma.managedFile.findUnique({
      where: { id: fileId },
    });

    if (!existing) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Check access
    const hasAccess = await checkFileAccess(user.id, user.role, fileId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Only file owner or admin can share
    if (existing.uploadedById !== user.id && user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only file owner or admin can share this file' });
      return;
    }

    // Generate share token if not already shared
    const shareToken = existing.shareToken || crypto.randomUUID();

    const updated = await prisma.managedFile.update({
      where: { id: fileId },
      data: {
        isPublic: true,
        shareToken,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Share file error:', error);
    res.status(500).json({ error: 'Failed to share file' });
  }
});

// Unshare file (make private)
router.delete('/:id/share', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const fileId = req.params.id;

    const existing = await prisma.managedFile.findUnique({
      where: { id: fileId },
    });

    if (!existing) {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Check access
    const hasAccess = await checkFileAccess(user.id, user.role, fileId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Only file owner or admin can unshare
    if (existing.uploadedById !== user.id && user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only file owner or admin can unshare this file' });
      return;
    }

    const updated = await prisma.managedFile.update({
      where: { id: fileId },
      data: {
        isPublic: false,
        shareToken: null,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Unshare file error:', error);
    res.status(500).json({ error: 'Failed to unshare file' });
  }
});

export default router;
