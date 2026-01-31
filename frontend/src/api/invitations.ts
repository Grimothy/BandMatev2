import api from './client';

export interface InvitationDetails {
  email: string;
  name: string | null;
  role: string;
  expiresAt: string;
  invitedBy: {
    name: string;
  };
  projects: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
}

export interface PendingInvitation {
  id: string;
  email: string;
  name: string | null;
  role: string;
  expiresAt: string;
  invitedBy: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  inviteLink: string;
}

export interface CreateInvitationParams {
  email: string;
  name?: string;
  role?: string;
  projectIds?: string[];
}

export interface CreateInvitationResponse {
  invitation: Omit<PendingInvitation, 'inviteLink'>;
  inviteLink: string;
}

/**
 * Validate an invitation token (public)
 */
export async function validateInvitation(token: string): Promise<InvitationDetails> {
  const response = await api.get<{ invitation: InvitationDetails }>(
    `/invitations/validate/${token}`
  );
  return response.data.invitation;
}

/**
 * Accept an invitation with password (public)
 */
export async function acceptInvitation(
  token: string,
  password: string,
  name?: string
): Promise<{ message: string; user: { id: string; email: string; name: string; role: string } }> {
  const response = await api.post(`/invitations/accept/${token}`, { password, name });
  return response.data;
}

/**
 * Create a new invitation (admin only)
 */
export async function createInvitation(
  params: CreateInvitationParams
): Promise<CreateInvitationResponse> {
  const response = await api.post<CreateInvitationResponse>('/invitations', params);
  return response.data;
}

/**
 * List pending invitations (admin only)
 */
export async function listInvitations(): Promise<PendingInvitation[]> {
  const response = await api.get<{ invitations: PendingInvitation[] }>('/invitations');
  return response.data.invitations;
}

/**
 * Revoke an invitation (admin only)
 */
export async function revokeInvitation(id: string): Promise<void> {
  await api.delete(`/invitations/${id}`);
}
