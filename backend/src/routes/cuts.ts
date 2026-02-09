import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { deleteFile, uploadCutAudio, getCutAudioFilePath } from '../services/upload';
import { createCutFolder, deleteCutFolder, moveCutFolder } from '../services/folders';
import { generateUniqueSlug } from '../utils/slug';
import { createActivity } from '../services/activities';
import { checkVibeAccess, checkCutAccess } from '../services/access';
import prisma from '../lib/prisma';
import path from 'path';

const router = Router();

// All routes require authentication
router.use(authMiddleware);

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
    const { name, bpm, timeSignature } = req.body;

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
        bpm: bpm !== undefined ? bpm : null,
        timeSignature: timeSignature !== undefined ? timeSignature : null,
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

    // Get project info for activity
    const project = await prisma.project.findUnique({
      where: { id: vibe.projectId },
      select: { id: true, name: true, slug: true },
    });

    if (project) {
      // Create activity entry
      await createActivity({
        type: 'cut_created',
        userId: user.id,
        projectId: project.id,
        metadata: {
          cutName: name,
          vibeName: vibe.name,
          projectName: project.name,
        },
        resourceLink: `/cuts/${cut.id}`,
      });
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
    const { name, bpm, timeSignature } = req.body;

    const existing = await prisma.cut.findUnique({
      where: { id: cutId },
    });

    if (!existing) {
      res.status(404).json({ error: 'Cut not found' });
      return;
    }

    // Check access - any project member can update cut metadata
    const hasAccess = await checkCutAccess(user.id, user.role, cutId);
    if (!hasAccess) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Build update data - only include fields that were provided
    const updateData: { name?: string; bpm?: number | null; timeSignature?: string | null } = {};
    if (name !== undefined) updateData.name = name;
    if (bpm !== undefined) updateData.bpm = bpm;
    if (timeSignature !== undefined) updateData.timeSignature = timeSignature;

    const cut = await prisma.cut.update({
      where: { id: cutId },
      data: updateData,
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

    // Get cut with project info for activity
    const cutWithProject = await prisma.cut.findUnique({
      where: { id: cutId },
      include: {
        vibe: {
          include: {
            project: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    // Create activity entry for comment
    if (cutWithProject) {
      await createActivity({
        type: 'comment_added',
        userId: user.id,
        projectId: cutWithProject.vibe.projectId,
        metadata: {
          cutName: cutWithProject.name,
          vibeName: cutWithProject.vibe.name,
          projectName: cutWithProject.vibe.project.name,
          isReply: !!parentId,
          commentId: comment.id,
        },
        resourceLink: `/cuts/${cutId}?tab=audio&comment=${comment.id}`,
      });
    }

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

    // Get cut with project info for activity
    const cutWithProject = await prisma.cut.findUnique({
      where: { id: cutId },
      include: {
        vibe: {
          include: {
            project: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    // Create activity entry for lyrics update
    if (cutWithProject) {
      await createActivity({
        type: 'lyrics_updated',
        userId: user.id,
        projectId: cutWithProject.vibe.projectId,
        metadata: {
          cutName: cutWithProject.name,
          vibeName: cutWithProject.vibe.name,
          projectName: cutWithProject.vibe.project.name,
        },
        resourceLink: `/cuts/${cutId}?tab=lyrics`,
      });
    }

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

// Move cut to a different vibe
router.patch('/:id/move', async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const cutId = req.params.id;
    const { targetVibeId } = req.body;

    if (!targetVibeId) {
      res.status(400).json({ error: 'Target vibe ID is required' });
      return;
    }

    // Get the cut with its current vibe and project info
    const cut = await prisma.cut.findUnique({
      where: { id: cutId },
      include: {
        vibe: {
          include: {
            project: {
              select: { id: true, slug: true, name: true },
            },
          },
        },
        managedFiles: true,
      },
    });

    if (!cut) {
      res.status(404).json({ error: 'Cut not found' });
      return;
    }

    // Check access to the source cut
    const hasAccessToSource = await checkCutAccess(user.id, user.role, cutId);
    if (!hasAccessToSource) {
      res.status(403).json({ error: 'Access denied to source cut' });
      return;
    }

    // Get the target vibe with project info
    const targetVibe = await prisma.vibe.findUnique({
      where: { id: targetVibeId },
      include: {
        project: {
          select: { id: true, slug: true },
        },
      },
    });

    if (!targetVibe) {
      res.status(404).json({ error: 'Target vibe not found' });
      return;
    }

    // Check access to the target vibe
    const hasAccessToTarget = await checkVibeAccess(user.id, user.role, targetVibeId);
    if (!hasAccessToTarget) {
      res.status(403).json({ error: 'Access denied to target vibe' });
      return;
    }

    // Ensure both vibes are in the same project
    if (cut.vibe.projectId !== targetVibe.projectId) {
      res.status(400).json({ error: 'Cannot move cuts between different projects' });
      return;
    }

    // Check if already in the target vibe
    if (cut.vibeId === targetVibeId) {
      res.status(400).json({ error: 'Cut is already in this vibe' });
      return;
    }

    // Check for slug collision in the target vibe
    const existingCutWithSlug = await prisma.cut.findFirst({
      where: {
        vibeId: targetVibeId,
        slug: cut.slug,
      },
    });

    let newSlug = cut.slug;
    if (existingCutWithSlug) {
      // Generate a unique slug for the target vibe
      const existingCuts = await prisma.cut.findMany({
        where: { vibeId: targetVibeId },
        select: { slug: true },
      });
      const existingSlugs = existingCuts.map(c => c.slug);
      newSlug = generateUniqueSlug(cut.name, existingSlugs);
    }

    // Get the max order in the target vibe
    const maxOrder = await prisma.cut.aggregate({
      where: { vibeId: targetVibeId },
      _max: { order: true },
    });
    const newOrder = (maxOrder._max.order ?? -1) + 1;

    // Move the physical files if they exist
    const projectSlug = cut.vibe.project.slug;
    const sourceVibeSlug = cut.vibe.slug;
    const targetVibeSlug = targetVibe.slug;

    let pathMapping: { oldPathPrefix: string; newPathPrefix: string } | null = null;

    try {
      pathMapping = await moveCutFolder(
        projectSlug,
        sourceVibeSlug,
        targetVibeSlug,
        newSlug !== cut.slug ? cut.slug : cut.slug // Use old slug for source
      );

      // If slug changed, rename the folder in the target location
      if (newSlug !== cut.slug) {
        const fs = await import('fs');
        const oldPath = `./uploads/${projectSlug}/${targetVibeSlug}/${cut.slug}`;
        const newPath = `./uploads/${projectSlug}/${targetVibeSlug}/${newSlug}`;
        await fs.promises.rename(oldPath, newPath);
        pathMapping.newPathPrefix = `${projectSlug}/${targetVibeSlug}/${newSlug}`;
      }
    } catch (e) {
      console.error('Failed to move cut folder:', e);
      // Continue even if folder move fails (might not have files yet)
    }

    // Update the cut in the database
    const updatedCut = await prisma.cut.update({
      where: { id: cutId },
      data: {
        vibeId: targetVibeId,
        slug: newSlug,
        order: newOrder,
      },
      include: {
        vibe: {
          select: {
            id: true,
            name: true,
            slug: true,
            project: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        managedFiles: {
          where: { type: 'CUT' },
        },
      },
    });

    // Update managed file paths if folder was moved
    if (pathMapping && cut.managedFiles.length > 0) {
      const fileUpdates = cut.managedFiles.map((file) => {
        const newPath = file.path.replace(pathMapping!.oldPathPrefix, pathMapping!.newPathPrefix);
        return prisma.managedFile.update({
          where: { id: file.id },
          data: { path: newPath },
        });
      });
      await prisma.$transaction(fileUpdates);
    }

    // Create activity entry
    await createActivity({
      type: 'cut_moved',
      userId: user.id,
      projectId: cut.vibe.projectId,
      metadata: {
        cutName: cut.name,
        fromVibeName: cut.vibe.name,
        toVibeName: targetVibe.name,
        projectName: cut.vibe.project.name,
      },
      resourceLink: `/cuts/${cutId}`,
    });

    res.json(updatedCut);
  } catch (error) {
    console.error('Move cut error:', error);
    res.status(500).json({ error: 'Failed to move cut' });
  }
});

export default router;
