import { Router, Response, Request } from 'express';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Uploads root directory for path traversal protection
const uploadsRoot = path.resolve('./uploads');

// Sanitize filename for Content-Disposition header to prevent header injection
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^\w\s.-]/g, '_')  // Replace special chars with underscore
    .substring(0, 255);  // Limit length
}

// Public file access via share token
router.get('/files/:shareToken', async (req: Request, res: Response) => {
  try {
    const { shareToken } = req.params;

    const file = await prisma.managedFile.findUnique({
      where: { shareToken },
    });

    // Combine checks to prevent timing attacks
    if (!file || !file.isPublic) {
      res.status(404).json({ error: 'File not found or not shared' });
      return;
    }

    // Resolve the file path
    const filePath = path.resolve(file.path);

    // Path traversal protection: ensure file is within uploads directory
    if (!filePath.startsWith(uploadsRoot)) {
      console.error('Path traversal attempt detected:', file.path);
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Check if file exists (async version)
    try {
      await fs.promises.access(filePath, fs.constants.R_OK);
    } catch {
      res.status(404).json({ error: 'File not found' });
      return;
    }

    // Set appropriate headers
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${sanitizeFilename(file.originalName)}"`);
    res.setHeader('Content-Length', file.fileSize);
    res.setHeader('Cache-Control', 'public, max-age=3600');  // Cache for 1 hour

    // Stream the file with error handling
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (err) => {
      console.error('File stream error:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to stream file' });
      } else {
        res.end();
      }
    });
    fileStream.pipe(res);
  } catch (error) {
    console.error('Public file access error:', error);
    res.status(500).json({ error: 'Failed to access file' });
  }
});

// Get public file metadata (for share page preview)
router.get('/files/:shareToken/info', async (req: Request, res: Response) => {
  try {
    const { shareToken } = req.params;

    const file = await prisma.managedFile.findUnique({
      where: { shareToken },
      select: {
        id: true,
        name: true,
        originalName: true,
        fileSize: true,
        mimeType: true,
        type: true,
        duration: true,
        isPublic: true,
        createdAt: true,
        cut: {
          select: {
            name: true,
            vibe: {
              select: {
                name: true,
                image: true,
                project: {
                  select: {
                    name: true,
                    image: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Combine checks to prevent timing attacks
    if (!file || !file.isPublic) {
      res.status(404).json({ error: 'File not found or not shared' });
      return;
    }

    // Flatten the response for easier frontend consumption
    const response = {
      id: file.id,
      name: file.name,
      originalName: file.originalName,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      type: file.type,
      duration: file.duration,
      createdAt: file.createdAt,
      cutName: file.cut?.name,
      vibeName: file.cut?.vibe?.name,
      vibeImage: file.cut?.vibe?.image,
      projectName: file.cut?.vibe?.project?.name,
      projectImage: file.cut?.vibe?.project?.image,
    };

    res.json(response);
  } catch (error) {
    console.error('Public file info error:', error);
    res.status(500).json({ error: 'Failed to get file info' });
  }
});

export default router;
