export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MEMBER';
  authProvider?: 'local' | 'google';
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectMember {
  id: string;
  userId: string;
  projectId: string;
  canCreateVibes: boolean;
  user: Pick<User, 'id' | 'name' | 'email'>;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  members: ProjectMember[];
  vibes: Vibe[];
}

export interface Vibe {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  theme: string | null;
  notes: string | null;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  project?: Pick<Project, 'id' | 'name' | 'slug' | 'image'>;
  cuts: Cut[];
}

export interface Cut {
  id: string;
  name: string;
  slug: string;
  vibeId: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  vibe?: Vibe;
  managedFiles?: AudioFile[]; // Audio files are ManagedFile with type='CUT'
  comments?: Comment[];
  _count?: {
    comments: number;
  };
}

// AudioFile is now a ManagedFile with type='CUT'
// Using 'name' field as the label
export interface AudioFile {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  name: string | null;  // This is the label (was 'label' in old AudioFile)
  duration: number | null;
  waveformData?: string | null;
  fileSize?: number;
  mimeType?: string;
  type?: 'CUT' | 'STEM';
  cutId: string;
  uploadedById: string;
  uploadedBy?: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  createdAt: string;
}

export interface Comment {
  id: string;
  content: string;
  timestamp: number | null;
  managedFileId: string;  // Changed from audioFileId
  cutId: string;
  userId: string;
  parentId: string | null;
  user: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  managedFile: {  // Changed from audioFile
    id: string;
    name: string | null;  // Changed from label
    originalName: string;
  };
  replies?: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface ApiError {
  error: string;
}

export interface ManagedFile {
  id: string;
  name: string | null;  // User-defined label
  filename: string;
  originalName: string;
  path: string;
  fileSize: number;
  mimeType: string;
  type: 'CUT' | 'STEM';
  duration?: number | null;  // Audio-specific
  waveformData?: string | null;  // Audio-specific
  isPublic: boolean;
  shareToken?: string | null;
  cutId: string;
  uploadedById: string;
  uploadedBy?: Pick<User, 'id' | 'name' | 'avatarUrl'>;
  cut?: {
    id: string;
    name: string;
    slug: string;
    vibe: {
      id: string;
      name: string;
      slug: string;
      project: Pick<Project, 'id' | 'name' | 'slug'>;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export interface FileHierarchy {
  id: string;
  name: string;
  slug: string;
  image: string | null;
  vibes: {
    id: string;
    name: string;
    slug: string;
    image: string | null;
    cuts: Pick<Cut, 'id' | 'name' | 'slug'>[];
  }[];
}

// Lyrics types
export interface LyricsLine {
  timestamp: number;  // seconds
  text: string;
}

export interface AudioLyrics {
  audioFileId: string;
  lines: LyricsLine[];
}
