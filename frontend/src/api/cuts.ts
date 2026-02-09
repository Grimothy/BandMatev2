import api from './client';
import { Cut, AudioFile, Comment, AudioLyrics } from '../types';

export async function getCuts(vibeId: string): Promise<Cut[]> {
  const response = await api.get<Cut[]>(`/cuts/vibe/${vibeId}`);
  return response.data;
}

export async function getCut(id: string): Promise<Cut> {
  const response = await api.get<Cut>(`/cuts/${id}`);
  return response.data;
}

export async function createCut(vibeId: string, data: { name: string; bpm?: number; timeSignature?: string }): Promise<Cut> {
  const response = await api.post<Cut>(`/cuts/vibe/${vibeId}`, data);
  return response.data;
}

export async function updateCut(id: string, data: { name?: string; bpm?: number | null; timeSignature?: string | null }): Promise<Cut> {
  const response = await api.put<Cut>(`/cuts/${id}`, data);
  return response.data;
}

export async function deleteCut(id: string): Promise<void> {
  await api.delete(`/cuts/${id}`);
}

export async function uploadAudio(cutId: string, file: File): Promise<AudioFile> {
  const formData = new FormData();
  formData.append('audio', file);
  const response = await api.post<AudioFile>(`/cuts/${cutId}/audio`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function deleteAudio(cutId: string, audioId: string): Promise<void> {
  await api.delete(`/cuts/${cutId}/audio/${audioId}`);
}

export async function updateAudioLabel(cutId: string, audioId: string, label: string): Promise<AudioFile> {
  const response = await api.patch<AudioFile>(`/cuts/${cutId}/audio/${audioId}`, { label });
  return response.data;
}

export async function addComment(
  cutId: string,
  data: { content: string; timestamp: number; audioFileId?: string }
): Promise<Comment> {
  const response = await api.post<Comment>(`/cuts/${cutId}/comments`, data);
  return response.data;
}

export async function deleteComment(cutId: string, commentId: string): Promise<void> {
  await api.delete(`/cuts/${cutId}/comments/${commentId}`);
}

export async function updateComment(
  cutId: string,
  commentId: string,
  content: string
): Promise<Comment> {
  const response = await api.patch<Comment>(`/cuts/${cutId}/comments/${commentId}`, { content });
  return response.data;
}

export async function addReply(
  cutId: string,
  parentId: string,
  content: string
): Promise<Comment> {
  const response = await api.post<Comment>(`/cuts/${cutId}/comments`, { content, parentId });
  return response.data;
}

// Lyrics API
export async function getLyrics(cutId: string): Promise<AudioLyrics[]> {
  const response = await api.get<AudioLyrics[]>(`/cuts/${cutId}/lyrics`);
  return response.data;
}

export async function updateLyrics(cutId: string, lyrics: AudioLyrics[]): Promise<AudioLyrics[]> {
  const response = await api.put<AudioLyrics[]>(`/cuts/${cutId}/lyrics`, { lyrics });
  return response.data;
}

export async function reorderCuts(vibeId: string, cutIds: string[]): Promise<void> {
  await api.put(`/cuts/vibe/${vibeId}/reorder`, { cutIds });
}

export async function moveCut(cutId: string, targetVibeId: string): Promise<Cut> {
  const response = await api.patch<Cut>(`/cuts/${cutId}/move`, { targetVibeId });
  return response.data;
}
