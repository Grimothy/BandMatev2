import fs from 'fs';
import path from 'path';

const UPLOADS_BASE = './uploads';

/**
 * Folder structure (using human-readable slugs):
 * uploads/
 * ├── images/                          # Project and Vibe cover images (unchanged)
 * └── {project-slug}/
 *     └── {vibe-slug}/
 *         └── {cut-slug}/
 *             ├── audio/               # Cut audio files
 *             └── stems/               # Stem files
 */

// ============================================
// Path Generators (using slugs)
// ============================================

export function getProjectPath(projectSlug: string): string {
  return path.join(UPLOADS_BASE, projectSlug);
}

export function getVibePath(projectSlug: string, vibeSlug: string): string {
  return path.join(getProjectPath(projectSlug), vibeSlug);
}

export function getCutPath(projectSlug: string, vibeSlug: string, cutSlug: string): string {
  return path.join(getVibePath(projectSlug, vibeSlug), cutSlug);
}

export function getCutAudioPath(projectSlug: string, vibeSlug: string, cutSlug: string): string {
  return path.join(getCutPath(projectSlug, vibeSlug, cutSlug), 'audio');
}

export function getCutStemsPath(projectSlug: string, vibeSlug: string, cutSlug: string): string {
  return path.join(getCutPath(projectSlug, vibeSlug, cutSlug), 'stems');
}

// ============================================
// Directory Management
// ============================================

export function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

export function ensureDirAsync(dir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.mkdir(dir, { recursive: true }, (err) => {
      if (err && err.code !== 'EEXIST') {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

export async function deleteDir(dir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.rm(dir, { recursive: true, force: true }, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

// ============================================
// Folder Creation for Entities
// ============================================

/**
 * Creates the folder structure for a new project
 */
export async function createProjectFolder(projectSlug: string): Promise<void> {
  const projectPath = getProjectPath(projectSlug);
  await ensureDirAsync(projectPath);
}

/**
 * Creates the folder structure for a new vibe
 */
export async function createVibeFolder(projectSlug: string, vibeSlug: string): Promise<void> {
  const vibePath = getVibePath(projectSlug, vibeSlug);
  await ensureDirAsync(vibePath);
}

/**
 * Creates the folder structure for a new cut
 */
export async function createCutFolder(projectSlug: string, vibeSlug: string, cutSlug: string): Promise<void> {
  const cutPath = getCutPath(projectSlug, vibeSlug, cutSlug);
  await ensureDirAsync(cutPath);
  await ensureDirAsync(getCutAudioPath(projectSlug, vibeSlug, cutSlug));
  await ensureDirAsync(getCutStemsPath(projectSlug, vibeSlug, cutSlug));
}

// ============================================
// Folder Cleanup for Entity Deletion
// ============================================

/**
 * Deletes the entire project folder and all contents
 */
export async function deleteProjectFolder(projectSlug: string): Promise<void> {
  const projectPath = getProjectPath(projectSlug);
  try {
    await deleteDir(projectPath);
  } catch (e) {
    console.error(`Failed to delete project folder ${projectPath}:`, e);
  }
}

/**
 * Deletes the entire vibe folder and all contents
 */
export async function deleteVibeFolder(projectSlug: string, vibeSlug: string): Promise<void> {
  const vibePath = getVibePath(projectSlug, vibeSlug);
  try {
    await deleteDir(vibePath);
  } catch (e) {
    console.error(`Failed to delete vibe folder ${vibePath}:`, e);
  }
}

/**
 * Deletes the entire cut folder and all contents
 */
export async function deleteCutFolder(projectSlug: string, vibeSlug: string, cutSlug: string): Promise<void> {
  const cutPath = getCutPath(projectSlug, vibeSlug, cutSlug);
  try {
    await deleteDir(cutPath);
  } catch (e) {
    console.error(`Failed to delete cut folder ${cutPath}:`, e);
  }
}

/**
 * Moves a cut folder from one vibe to another within the same project
 * Returns the new path prefix for updating file references
 */
export async function moveCutFolder(
  projectSlug: string,
  sourceVibeSlug: string,
  targetVibeSlug: string,
  cutSlug: string
): Promise<{ oldPathPrefix: string; newPathPrefix: string }> {
  const sourcePath = getCutPath(projectSlug, sourceVibeSlug, cutSlug);
  const targetPath = getCutPath(projectSlug, targetVibeSlug, cutSlug);
  
  // Ensure target vibe directory exists
  await ensureDirAsync(getVibePath(projectSlug, targetVibeSlug));
  
  // Move the folder
  await fs.promises.rename(sourcePath, targetPath);
  
  return {
    oldPathPrefix: `${projectSlug}/${sourceVibeSlug}/${cutSlug}`,
    newPathPrefix: `${projectSlug}/${targetVibeSlug}/${cutSlug}`,
  };
}

// ============================================
// Initialize base directories
// ============================================

export function initializeBaseDirectories(): void {
  ensureDir(path.join(UPLOADS_BASE, 'images'));
}

// Initialize on module load
initializeBaseDirectories();
