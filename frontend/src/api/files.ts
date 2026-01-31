import api from './client';
import { ManagedFile, FileHierarchy } from '../types';

export interface FileFilters {
  projectId?: string;
  vibeId?: string;
  cutId?: string;
  type?: 'CUT' | 'STEM';
  sort?: 'createdAt' | 'name' | 'originalName' | 'fileSize' | 'type';
  order?: 'asc' | 'desc';
}

export async function getManagedFiles(filters?: FileFilters): Promise<ManagedFile[]> {
  const params = new URLSearchParams();
  if (filters?.projectId) params.append('projectId', filters.projectId);
  if (filters?.vibeId) params.append('vibeId', filters.vibeId);
  if (filters?.cutId) params.append('cutId', filters.cutId);
  if (filters?.type) params.append('type', filters.type);
  if (filters?.sort) params.append('sort', filters.sort);
  if (filters?.order) params.append('order', filters.order);
  
  const queryString = params.toString();
  const url = queryString ? `/files?${queryString}` : '/files';
  
  const response = await api.get<ManagedFile[]>(url);
  return response.data;
}

export async function getManagedFile(id: string): Promise<ManagedFile> {
  const response = await api.get<ManagedFile>(`/files/${id}`);
  return response.data;
}

export async function uploadCut(
  cutId: string,
  file: File,
  options?: { name?: string }
): Promise<ManagedFile> {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.name) formData.append('name', options.name);
  
  const response = await api.post<ManagedFile>(`/files/cut/${cutId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function uploadStem(
  cutId: string,
  file: File,
  options?: { name?: string }
): Promise<ManagedFile> {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.name) formData.append('name', options.name);
  
  const response = await api.post<ManagedFile>(`/files/stem/${cutId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function updateManagedFile(
  id: string,
  data: { name?: string }
): Promise<ManagedFile> {
  const response = await api.patch<ManagedFile>(`/files/${id}`, data);
  return response.data;
}

export async function deleteManagedFile(id: string): Promise<void> {
  await api.delete(`/files/${id}`);
}

export async function shareFile(id: string): Promise<ManagedFile> {
  const response = await api.post<ManagedFile>(`/files/${id}/share`);
  return response.data;
}

export async function unshareFile(id: string): Promise<ManagedFile> {
  const response = await api.delete<ManagedFile>(`/files/${id}/share`);
  return response.data;
}

export function getPublicShareUrl(shareToken: string): string {
  // Use the current origin for the public share URL
  // Points to the frontend shared file player page
  const baseUrl = window.location.origin;
  return `${baseUrl}/shared/${shareToken}`;
}

// Get the direct download URL for a shared file
export function getPublicFileDownloadUrl(shareToken: string): string {
  const baseUrl = window.location.origin;
  return `${baseUrl}/api/public/files/${shareToken}`;
}

export async function getFileHierarchy(): Promise<FileHierarchy[]> {
  const response = await api.get<FileHierarchy[]>('/files/meta/hierarchy');
  return response.data;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
