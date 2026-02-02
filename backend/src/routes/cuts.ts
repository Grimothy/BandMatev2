import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { deleteFile, uploadCutAudio, getCutAudioFilePath } from '../services/upload';
import { createCutFolder, deleteCutFolder } from '../services/folders';
import { generateUniqueSlug } from '../utils/slug';
import path from 'path';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authMiddleware);

// Helper to check project access via vibe
async function checkVibeAccess(userId: string, userRole: string, vibeId: string): Promise<boolean> {
  if (userRole === 'ADMIN') return true;
  
  const vibe = await prisma.vibe.findUnique({
    where: { id: vibeId },
    select: { projectId: true },
  });
  
  if (!vibe) return false;
  
  const member = await prisma.projectMember.findUnique({
    where: {
      userId_projectId: {
        userId,
        projectId: vibe.projectId,
      },
    },
  });
  
  return !!member;
}

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

// List cuts for a vibe
router.get('/vibe/:vibeId', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { vibeId } = req.params;

    // Check access
    const hasAccess = await checkVibeAccess(user.id, user.role, vibeId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const cuts = await prisma.cut.findMany({
      where: { vibeId },
      include: {
        managedFiles: {
          where: { type: 'CUT' }, // Only audio files
          select: {
            id: true,
            filename: true,
            originalName: true,
            path: true,
            duration: true,
            name: true, // This is the label
          },
        },
        _count: {
          select: { comments: true },
        },
      },
      orderBy: { order: 'asc' },
    });

    res.json(cuts);
  } catch (error) {
    console.error('List cuts error:', error);
    res.status(500).json({ error: 'Failed to list cuts' });
  }
});

// Get single cut
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const cutId = req.params.id;

    const cut = await prisma.cut.findUnique({
      where: { id: cutId },
      include: {
        vibe: {
          select: {
            id: true,
            name: true,
            slug: true,
            image: true,
            project: {
              select: { id: true, name: true, slug: true, image: true },
            },
          },
        },
        managedFiles: {
          where: { type: 'CUT' }, // Only audio files
          include: {
            uploadedBy: {
              select: { id: true, name: true, avatarUrl: true },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        comments: {
          where: { parentId: null }, // Only fetch top-level comments
      include: {
        user: {
          select: { id: true, name: true, avatarUrl: true },
        },
        managedFile: {
              select: { id: true, name: true, originalName: true },
            },
            replies: {
              include: {
                user: {
                  select: { id: true, name: true, avatarUrl: true },
                },
                managedFile: {
                  select: { id: true, name: true, originalName: true },
                },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
          orderBy: { timestamp: 'asc' },
        },
      },
    });

    if (!cut) {
      res.status(404).json({ error: 'Cut not found' });
      return;
    }

    // Check access
    const hasAccess = await checkCutAccess(user.id, user.role, cutId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    res.json(cut);
  } catch (error) {
    console.error('Get cut error:', error);
    res.status(500).json({ error: 'Failed to get cut' });
  }
});

// Create cut
router.post('/vibe/:vibeId', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { vibeId } = req.params;
    const { name } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Cut name is required' });
      return;
    }

    // Check vibe exists and get project info for folder creation
    const vibe = await prisma.vibe.findUnique({
      where: { id: vibeId },
      include: {
        project: {
          select: { slug: true },
        },
      },
    });

    if (!vibe) {
      res.status(404).json({ error: 'Vibe not found' });
      return;
    }

    // Check access
    const hasAccess = await checkVibeAccess(user.id, user.role, vibeId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Get existing cut slugs within this vibe to ensure uniqueness
    const existingCuts = await prisma.cut.findMany({
      where: { vibeId },
      select: { slug: true },
    });
    const existingSlugs = existingCuts.map(c => c.slug);
    const slug = generateUniqueSlug(name, existingSlugs);

    // Get the current max order for this vibe
    const maxOrder = await prisma.cut.aggregate({
      where: { vibeId },
      _max: { order: true },
    });

    const nextOrder = (maxOrder._max.order ?? -1) + 1;

    const cut = await prisma.cut.create({
      data: {
        name,
        slug,
        vibeId,
        order: nextOrder,
      },
      include: {
        managedFiles: {
          where: { type: 'CUT' },
        },
      },
    });

    // Create the cut folder structure
    try {
      await createCutFolder(vibe.project.slug, vibe.slug, slug);
    } catch (e) {
      console.error('Failed to create cut folder:', e);
    }

    res.status(201).json(cut);
  } catch (error) {
    console.error('Create cut error:', error);
    res.status(500).json({ error: 'Failed to create cut' });
  }
});

// Update cut
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const cutId = req.params.id;
    const { name } = req.body;

    const existing = await prisma.cut.findUnique({
      where: { id: cutId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Cut not found' });
      return;
    }

    // Check access
    const hasAccess = await checkCutAccess(user.id, user.role, cutId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Only admin can modify cuts
    if (user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only admins can modify cuts' });
      return;
    }

    const cut = await prisma.cut.update({
      where: { id: cutId },
      data: { name: name ?? existing.name },
      include: {
        managedFiles: {
          where: { type: 'CUT' },
        },
      },
    });

    res.json(cut);
  } catch (error) {
    console.error('Update cut error:', error);
    res.status(500).json({ error: 'Failed to update cut' });
  }
});

// Delete cut
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const cutId = req.params.id;

    const existing = await prisma.cut.findUnique({
      where: { id: cutId },
      include: {
        managedFiles: true,
        vibe: {
          include: {
            project: {
              select: { slug: true },
            },
          },
        },
      },
    });

    if (!existing) {
      res.status(404).json({ error: 'Cut not found' });
      return;
    }

    // Check access
    const hasAccess = await checkCutAccess(user.id, user.role, cutId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Only admin can delete cuts
    if (user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Only admins can delete cuts' });
      return;
    }

    // Delete all files (for legacy files not in hierarchical folders)
    for (const file of existing.managedFiles) {
      try {
        await deleteFile(file.path);
      } catch (e) {
        console.error('Failed to delete file:', e);
      }
    }

    await prisma.cut.delete({
      where: { id: cutId },
    });

    // Delete the cut folder and all its contents
    try {
      await deleteCutFolder(existing.vibe.project.slug, existing.vibe.slug, existing.slug);
    } catch (e) {
      console.error('Failed to delete cut folder:', e);
    }

    res.json({ message: 'Cut deleted successfully' });
  } catch (error) {
    console.error('Delete cut error:', error);
    res.status(500).json({ error: 'Failed to delete cut' });
  }
});

// Upload audio file to cut
// First middleware to fetch cut info and set uploadContext for hierarchical storage
const prepareCutUpload = async (req: AuthRequest, res: Response, next: Function) => {
  try {
    const cutId = req.params.id;
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
    console.error('Prepare cut upload error:', error);
    res.status(500).json({ error: 'Failed to prepare upload' });
  }
};

router.post(
  '/:id/audio',
  prepareCutUpload,
  uploadCutAudio.single('audio'),
  async (req: AuthRequest, res: Response) => {
    try {
      const user = req.user!;
      const cutId = req.params.id;
      const cut = (req as any).cutData;

      // Check access
      const hasAccess = await checkCutAccess(user.id, user.role, cutId);
      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: 'No audio file provided' });
        return;
      }

      const audioPath = getCutAudioFilePath(
        cut.vibe.project.slug,
        cut.vibe.slug,
        cut.slug,
        req.file.filename
      );

      // Create ManagedFile with type="CUT" for audio
      const managedFile = await prisma.managedFile.create({
        data: {
          filename: req.file.filename,
          originalName: req.file.originalname,
          path: audioPath,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          type: 'CUT',
          cutId,
          uploadedById: user.id,
        },
        include: {
          uploadedBy: {
            select: { id: true, name: true, avatarUrl: true },
          },
        },
      });

      res.status(201).json(managedFile);
    } catch (error) {
      console.error('Upload audio error:', error);
      res.status(500).json({ error: 'Failed to upload audio' });
    }
  }
);

// Update audio file (label/name)
router.patch('/:cutId/audio/:audioId', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { cutId, audioId } = req.params;
    const { label } = req.body;

    const managedFile = await prisma.managedFile.findFirst({
      where: {
        id: audioId,
        cutId,
        type: 'CUT',
      },
    });

    if (!managedFile) {
      res.status(404).json({ error: 'Audio file not found' });
      return;
    }

    // Check access
    const hasAccess = await checkCutAccess(user.id, user.role, cutId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const updated = await prisma.managedFile.update({
      where: { id: audioId },
      data: { name: label || null },
      include: {
        uploadedBy: {
          select: { id: true, name: true, avatarUrl: true },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update audio error:', error);
    res.status(500).json({ error: 'Failed to update audio file' });
  }
});

// Delete audio file
router.delete('/:cutId/audio/:audioId', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { cutId, audioId } = req.params;

    const managedFile = await prisma.managedFile.findFirst({
      where: {
        id: audioId,
        cutId,
        type: 'CUT',
      },
    });

    if (!managedFile) {
      res.status(404).json({ error: 'Audio file not found' });
      return;
    }

    // Check access
    const hasAccess = await checkCutAccess(user.id, user.role, cutId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Delete file from disk
    try {
      await deleteFile(managedFile.path);
    } catch (e) {
      console.error('Failed to delete audio file from disk:', e);
    }

    // Delete from ManagedFile table
    await prisma.managedFile.delete({
      where: { id: audioId },
    });

    res.json({ message: 'Audio file deleted successfully' });
  } catch (error) {
    console.error('Delete audio error:', error);
    res.status(500).json({ error: 'Failed to delete audio' });
  }
});

// Add comment to cut (or reply to existing comment)
router.post('/:id/comments', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const cutId = req.params.id;
    const { content, timestamp, audioFileId, parentId } = req.body;

    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    let finalAudioFileId = audioFileId;
    let finalTimestamp = timestamp !== undefined ? parseFloat(timestamp) : null;

    // If this is a reply, inherit audioFileId from parent
    if (parentId) {
      const parentComment = await prisma.comment.findFirst({
        where: {
          id: parentId,
          cutId,
        },
      });

      if (!parentComment) {
        res.status(404).json({ error: 'Parent comment not found' });
        return;
      }

      // Inherit audioFileId from parent
      finalAudioFileId = parentComment.managedFileId;
      // Replies don't need a timestamp (they inherit context from parent)
      finalTimestamp = null;
    } else {
      // Top-level comment requires timestamp and audioFileId
      if (timestamp === undefined || !audioFileId) {
        res.status(400).json({ error: 'Timestamp and audioFileId are required for top-level comments' });
        return;
      }
    }

    // Verify the audio file exists and belongs to this cut
    const managedFile = await prisma.managedFile.findFirst({
      where: {
        id: finalAudioFileId,
        cutId,
        type: 'CUT',
      },
    });

    if (!managedFile) {
      res.status(404).json({ error: 'Audio file not found in this cut' });
      return;
    }

    // Check access
    const hasAccess = await checkCutAccess(user.id, user.role, cutId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const comment = await prisma.comment.create({
      data: {
        content,
        timestamp: finalTimestamp,
        managedFileId: finalAudioFileId,
        cutId,
        userId: user.id,
        parentId: parentId || null,
      },
      include: {
        user: {
          select: { id: true, name: true },
        },
        managedFile: {
          select: { id: true, name: true, originalName: true },
        },
      },
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Delete comment
router.delete('/:cutId/comments/:commentId', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { cutId, commentId } = req.params;

    const comment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        cutId,
      },
    });

    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    // Only comment owner or admin can delete
    if (comment.userId !== user.id && user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Update comment
router.patch('/:cutId/comments/:commentId', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { cutId, commentId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const comment = await prisma.comment.findFirst({
      where: {
        id: commentId,
        cutId,
      },
    });

    if (!comment) {
      res.status(404).json({ error: 'Comment not found' });
      return;
    }

    // Only comment owner or admin can edit
    if (comment.userId !== user.id && user.role !== 'ADMIN') {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const updated = await prisma.comment.update({
      where: { id: commentId },
      data: { content: content.trim() },
      include: {
        user: {
          select: { id: true, name: true },
        },
        managedFile: {
          select: { id: true, name: true, originalName: true },
        },
      },
    });

    res.json(updated);
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Get lyrics for a cut
router.get('/:id/lyrics', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const cutId = req.params.id;

    // Check access
    const hasAccess = await checkCutAccess(user.id, user.role, cutId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const cut = await prisma.cut.findUnique({
      where: { id: cutId },
      select: { lyrics: true },
    });

    if (!cut) {
      res.status(404).json({ error: 'Cut not found' });
      return;
    }

    // Parse lyrics JSON or return empty array
    const lyrics = cut.lyrics ? JSON.parse(cut.lyrics) : [];
    res.json(lyrics);
  } catch (error) {
    console.error('Get lyrics error:', error);
    res.status(500).json({ error: 'Failed to get lyrics' });
  }
});

// Update lyrics for a cut
router.put('/:id/lyrics', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const cutId = req.params.id;
    const { lyrics } = req.body;

    // Check access
    const hasAccess = await checkCutAccess(user.id, user.role, cutId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const existing = await prisma.cut.findUnique({
      where: { id: cutId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Cut not found' });
      return;
    }

    // Validate lyrics structure
    if (!Array.isArray(lyrics)) {
      res.status(400).json({ error: 'Lyrics must be an array' });
      return;
    }

    // Validate each lyrics entry
    for (const entry of lyrics) {
      if (!entry.audioFileId || typeof entry.audioFileId !== 'string') {
        res.status(400).json({ error: 'Each lyrics entry must have an audioFileId (managedFileId)' });
        return;
      }
      if (!Array.isArray(entry.lines)) {
        res.status(400).json({ error: 'Each lyrics entry must have a lines array' });
        return;
      }
      for (const line of entry.lines) {
        if (typeof line.timestamp !== 'number' || typeof line.text !== 'string') {
          res.status(400).json({ error: 'Each line must have a timestamp (number) and text (string)' });
          return;
        }
      }
    }

    const updated = await prisma.cut.update({
      where: { id: cutId },
      data: { lyrics: JSON.stringify(lyrics) },
      select: { lyrics: true },
    });

    res.json(updated.lyrics ? JSON.parse(updated.lyrics) : []);
  } catch (error) {
    console.error('Update lyrics error:', error);
    res.status(500).json({ error: 'Failed to update lyrics' });
  }
});

// Reorder cuts within a vibe
router.put('/vibe/:vibeId/reorder', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { vibeId } = req.params;
    const { cutIds } = req.body;

    if (!Array.isArray(cutIds)) {
      res.status(400).json({ error: 'cutIds must be an array' });
      return;
    }

    // Check access
    const hasAccess = await checkVibeAccess(user.id, user.role, vibeId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Verify all cuts belong to this vibe
    const cuts = await prisma.cut.findMany({
      where: { vibeId },
      select: { id: true },
    });

    const vibeCutIds = cuts.map(c => c.id);
    const invalidCuts = cutIds.filter(id => !vibeCutIds.includes(id));

    if (invalidCuts.length > 0) {
      res.status(400).json({ error: 'Some cut IDs do not belong to this vibe' });
      return;
    }

    // Update order for each cut
    const updates = cutIds.map((cutId, index) =>
      prisma.cut.update({
        where: { id: cutId },
        data: { order: index },
      })
    );

    await prisma.$transaction(updates);

    res.json({ message: 'Cuts reordered successfully' });
  } catch (error) {
    console.error('Reorder cuts error:', error);
    res.status(500).json({ error: 'Failed to reorder cuts' });
  }
});

export default router;
