import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getUsers, createUser, updateUser, deleteUser } from '../../api/users';
import { createInvitation, listInvitations, revokeInvitation, PendingInvitation } from '../../api/invitations';
import { getProjects } from '../../api/projects';
import { User, Project } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { SideSheet } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Loading } from '../../components/ui/Loading';

export function Users() {
  const { isAdmin, user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    role: 'MEMBER' as 'ADMIN' | 'MEMBER',
  });
  const [inviteFormData, setInviteFormData] = useState({
    email: '',
    name: '',
    role: 'MEMBER' as 'ADMIN' | 'MEMBER',
    projectIds: [] as string[],
  });
  const [inviteLink, setInviteLink] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const fetchUsers = async () => {
    try {
      const [userData, inviteData, projectData] = await Promise.all([
        getUsers(),
        listInvitations(),
        getProjects(),
      ]);
      setUsers(userData);
      setInvitations(inviteData);
      setProjects(projectData);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ email: '', password: '', name: '', role: 'MEMBER' });
    setError('');
    setShowModal(true);
  };

  const openInviteModal = () => {
    setInviteFormData({ email: '', name: '', role: 'MEMBER', projectIds: [] });
    setInviteLink('');
    setError('');
    setShowInviteModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      password: '',
      name: user.name,
      role: user.role,
    });
    setError('');
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.name || (!editingUser && !formData.password)) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (editingUser) {
        const updateData: Record<string, string> = {
          email: formData.email,
          name: formData.name,
          role: formData.role,
        };
        if (formData.password) {
          updateData.password = formData.password;
        }
        await updateUser(editingUser.id, updateData);
      } else {
        await createUser(formData);
      }
      setShowModal(false);
      fetchUsers();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (userId === currentUser?.id) {
      alert('You cannot delete your own account');
      return;
    }

    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      await deleteUser(userId);
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleInviteSubmit = async () => {
    if (!inviteFormData.email) {
      setError('Email is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const result = await createInvitation({
        email: inviteFormData.email,
        name: inviteFormData.name || undefined,
        role: inviteFormData.role,
        projectIds: inviteFormData.projectIds,
      });
      setInviteLink(result.inviteLink);
      fetchUsers(); // Refresh invitations list
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to create invitation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeInvitation = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;

    try {
      await revokeInvitation(id);
      fetchUsers();
    } catch (error) {
      console.error('Failed to revoke invitation:', error);
    }
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text">Users</h1>
          <p className="text-muted mt-1">Manage user accounts and invitations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={openInviteModal}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Invite User
          </Button>
          <Button onClick={openCreateModal}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New User
          </Button>
        </div>
      </div>

      {/* Users List */}
      {isLoading ? (
        <Loading className="py-12" />
      ) : users.length === 0 ? (
        <Card className="text-center py-12">
          <p className="text-muted">No users found</p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {users.map((user) => (
            <Card key={user.id} className="group">
              <div className="flex items-center gap-4">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-primary font-bold text-lg">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-text">{user.name}</h3>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded ${
                        user.role === 'ADMIN'
                          ? 'bg-primary/20 text-primary'
                          : 'bg-surface-light text-muted'
                      }`}
                    >
                      {user.role}
                    </span>
                    {user.id === currentUser?.id && (
                      <span className="text-xs text-muted">(You)</span>
                    )}
                  </div>
                  <p className="text-sm text-muted truncate">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEditModal(user)}
                    className="p-2 text-muted hover:text-primary transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  {user.id !== currentUser?.id && (
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="p-2 text-muted hover:text-error transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pending Invitations */}
      {!isLoading && invitations.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-text">Pending Invitations</h2>
          <div className="grid gap-4">
            {invitations.map((invitation) => (
              <Card key={invitation.id} className="group border-dashed">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-warning/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-text">{invitation.name || invitation.email}</h3>
                      <span className="px-2 py-0.5 text-xs font-medium rounded bg-warning/20 text-warning">
                        Pending
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded ${
                          invitation.role === 'ADMIN'
                            ? 'bg-primary/20 text-primary'
                            : 'bg-surface-light text-muted'
                        }`}
                      >
                        {invitation.role}
                      </span>
                    </div>
                    <p className="text-sm text-muted truncate">{invitation.email}</p>
                    <p className="text-xs text-muted">
                      Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(invitation.inviteLink);
                      }}
                      className="p-2 text-muted hover:text-primary transition-colors"
                      title="Copy invite link"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleRevokeInvitation(invitation.id)}
                      className="p-2 text-muted hover:text-error transition-colors"
                      title="Revoke invitation"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Create/Edit User Side Sheet */}
      <SideSheet
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingUser ? 'Edit User' : 'Create New User'}
        description={editingUser ? 'Update user account details' : 'Add a new user to the system'}
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} isLoading={isSubmitting}>
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="Enter name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            autoFocus
          />
          <Input
            label="Email"
            type="email"
            placeholder="Enter email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label={editingUser ? 'Password (leave blank to keep current)' : 'Password'}
            type="password"
            placeholder={editingUser ? 'Enter new password' : 'Enter password'}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-muted mb-1.5">Role</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="MEMBER"
                  checked={formData.role === 'MEMBER'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'MEMBER' })}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-text">Member</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="role"
                  value="ADMIN"
                  checked={formData.role === 'ADMIN'}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as 'ADMIN' })}
                  className="text-primary focus:ring-primary"
                />
                <span className="text-text">Admin</span>
              </label>
            </div>
          </div>
          {error && <p className="text-error text-sm">{error}</p>}
        </div>
      </SideSheet>

      {/* Invite User Side Sheet */}
      <SideSheet
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title={inviteLink ? 'Invitation Created' : 'Invite User'}
        description={inviteLink ? 'Share this link with the user' : 'Send an invitation to join the platform'}
        footer={
          inviteLink ? (
            <Button onClick={() => setShowInviteModal(false)}>Done</Button>
          ) : (
            <>
              <Button variant="secondary" onClick={() => setShowInviteModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleInviteSubmit} isLoading={isSubmitting}>
                Create Invitation
              </Button>
            </>
          )
        }
      >
        {inviteLink ? (
          <div className="space-y-4">
            <p className="text-muted text-sm">
              Share this link with the user to complete their registration:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={inviteLink}
                className="flex-1 px-3 py-2 bg-surface-light border border-border rounded-lg text-sm text-text"
              />
              <Button onClick={copyInviteLink}>Copy</Button>
            </div>
            <p className="text-muted text-xs">
              This invitation expires in 7 days.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="Enter email address"
              value={inviteFormData.email}
              onChange={(e) => setInviteFormData({ ...inviteFormData, email: e.target.value })}
              autoFocus
            />
            <Input
              label="Name (optional)"
              placeholder="Enter name"
              value={inviteFormData.name}
              onChange={(e) => setInviteFormData({ ...inviteFormData, name: e.target.value })}
            />
            <div>
              <label className="block text-sm font-medium text-muted mb-1.5">Role</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="inviteRole"
                    value="MEMBER"
                    checked={inviteFormData.role === 'MEMBER'}
                    onChange={(e) => setInviteFormData({ ...inviteFormData, role: e.target.value as 'MEMBER' })}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-text">Member</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="inviteRole"
                    value="ADMIN"
                    checked={inviteFormData.role === 'ADMIN'}
                    onChange={(e) => setInviteFormData({ ...inviteFormData, role: e.target.value as 'ADMIN' })}
                    className="text-primary focus:ring-primary"
                  />
                  <span className="text-text">Admin</span>
                </label>
              </div>
            </div>
            {projects.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-muted mb-1.5">
                  Add to Projects (optional)
                </label>
                <div className="max-h-32 overflow-y-auto space-y-2 border border-border rounded-lg p-2">
                  {projects.map((project) => (
                    <label key={project.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={inviteFormData.projectIds.includes(project.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setInviteFormData({
                              ...inviteFormData,
                              projectIds: [...inviteFormData.projectIds, project.id],
                            });
                          } else {
                            setInviteFormData({
                              ...inviteFormData,
                              projectIds: inviteFormData.projectIds.filter((id) => id !== project.id),
                            });
                          }
                        }}
                        className="text-primary focus:ring-primary"
                      />
                      <span className="text-text text-sm">{project.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
            {error && <p className="text-error text-sm">{error}</p>}
          </div>
        )}
      </SideSheet>
    </div>
  );
}
