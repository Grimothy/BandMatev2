import api from './client';
import { User, AuthResponse } from '../types';

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', { email, password });
  if (response.data.accessToken) {
    localStorage.setItem('accessToken', response.data.accessToken);
  }
  return response.data;
}

export async function logout(): Promise<void> {
  try {
    await api.post('/auth/logout');
  } finally {
    localStorage.removeItem('accessToken');
  }
}

export async function getCurrentUser(): Promise<User> {
  const response = await api.get<{ user: User }>('/auth/me');
  return response.data.user;
}

export async function refreshToken(): Promise<string> {
  const response = await api.post<{ accessToken: string }>('/auth/refresh');
  const { accessToken } = response.data;
  localStorage.setItem('accessToken', accessToken);
  return accessToken;
}

export async function isGoogleOAuthEnabled(): Promise<boolean> {
  try {
    const response = await api.get<{ enabled: boolean }>('/auth/google/enabled');
    return response.data.enabled;
  } catch {
    return false;
  }
}

export function getGoogleOAuthUrl(): string {
  // This redirects through the backend which handles the OAuth flow
  return '/api/auth/google';
}
