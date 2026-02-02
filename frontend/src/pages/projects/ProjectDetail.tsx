import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getProject, uploadProjectImage, addProjectMember, removeProjectMember } from '../../api/projects';
import { createVibe, deleteVibe, updateVibe, uploadVibeImage } from '../../api/vibes';
import { createCut, deleteCut, reorderCuts } from '../../api/cuts';
import { getUsers } from '../../api/users';
import { Project, User } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card, CardImage } from '../../components/ui/Card';
import { SideSheet } from '../../components/ui/Modal';
import { Input, Textarea } from '../../components/ui/Input';
import { Loading } from '../../components/ui/Loading';
import { VibeCard } from '../../components/vibes/VibeCard';
import { ImageUploadSheet } from '../../components/files/ImageUploadSheet';

export function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showVibeModal, setShowVibeModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [vibeForm, setVibeForm] = useState({ name: '', theme: '', notes: '' });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchProject = async () => {
    if (!id) return;
    try {
      const data = await getProject(id);
      setProject(data);
    } catch (error) {
      console.error('Failed to fetch project:', error);
      navigate('/projects');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [id]);

  const handleImageUpload = async (file: File) => {
    if (!id) return;
    await uploadProjectImage(id, file);
    fetchProject();
  };

  const handleCreateVibe = async () => {
    if (!vibeForm.name.trim() || !id) {
      setError('Vibe name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await createVibe(id, vibeForm);
      setVibeForm({ name: '', theme: '', notes: '' });
      setShowVibeModal(false);
      fetchProject();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to create vibe');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVibe = async (vibeId: string) => {
    try {
      await deleteVibe(vibeId);
      fetchProject();
    } catch (error) {
      console.error('Failed to delete vibe:', error);
    }
  };

  const handleUpdateVibe = async (vibeId: string, data: { name?: string; theme?: string; notes?: string }) => {
    await updateVibe(vibeId, data);
    fetchProject();
  };

  const handleUploadVibeImage = async (vibeId: string, file: File) => {
    await uploadVibeImage(vibeId, file);
    fetchProject();
  };

  const handleCreateCut = async (vibeId: string, name: string) => {
    await createCut(vibeId, name);
    fetchProject();
  };

  const handleDeleteCut = async (cutId: string) => {
    await deleteCut(cutId);
    fetchProject();
  };

  const handleReorderCuts = async (vibeId: string, cutIds: string[]) => {
    if (!project) return;

    // Optimistically update the UI immediately
    const updatedVibes = project.vibes?.map(vibe => {
      if (vibe.id === vibeId) {
        // Reorder cuts based on cutIds array
        const reorderedCuts = cutIds
          .map(cutId => vibe.cuts?.find(cut => cut.id === cutId))
          .filter((cut): cut is NonNullable<typeof cut> => cut !== undefined);
        
        return { ...vibe, cuts: reorderedCuts };
      }
      return vibe;
    });

    setProject({ ...project, vibes: updatedVibes });

    // Make API call in background
    try {
      await reorderCuts(vibeId, cutIds);
      // Success - the optimistic update was correct, no need to refetch
    } catch (error) {
      console.error('Failed to reorder cuts:', error);
      // On error, refetch to revert to server state
      fetchProject();
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserId || !id) return;

    setIsSubmitting(true);
    try {
      await addProjectMember(id, selectedUserId);
      setSelectedUserId('');
      setShowMemberModal(false);
      fetchProject();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to add member');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm('Remove this member from the project?') || !id) return;
    try {
      await removeProjectMember(id, userId);
      fetchProject();
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const openMemberModal = () => {
    fetchUsers();
    setShowMemberModal(true);
  };

  const availableUsers = users.filter(
    (u) => !project?.members?.some((m) => m.userId === u.id)
  );

  if (isLoading) {
    return <Loading className="py-12" />;
  }

  if (!project) {
    return (
      <Card className="text-center py-12">
        <p className="text-muted">Project not found</p>
        <Link to="/projects" className="text-primary hover:underline mt-2 inline-block">
          Back to projects
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <nav className="text-sm text-muted">
        <Link to="/projects" className="hover:text-text">Projects</Link>
        <span className="mx-2">/</span>
        <span className="text-text">{project.name}</span>
      </nav>

      {/* Project Header */}
      <div className="flex flex-col md:flex-row gap-6">
        <div className="relative w-full md:w-64 flex-shrink-0">
          <CardImage src={project.image} alt={project.name} className="aspect-square" />
          {isAdmin && (
            <button
              onClick={() => setShowImageUpload(true)}
              className="absolute bottom-2 right-2 p-2 bg-surface/80 rounded-lg text-muted hover:text-text transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-text">{project.name}</h1>
          
          {/* Members */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted">Members</span>
              {isAdmin && (
                <button
                  onClick={openMemberModal}
                  className="text-primary hover:text-primary-hover text-sm font-medium"
                >
                  Add member
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {project.members?.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-surface-light rounded-full"
                >
                  <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-primary text-xs font-medium">
                      {member.user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-text">{member.user.name}</span>
                  {isAdmin && (
                    <button
                      onClick={() => handleRemoveMember(member.userId)}
                      className="text-muted hover:text-error transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              ))}
              {(!project.members || project.members.length === 0) && (
                <span className="text-sm text-muted">No members yet</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Vibes Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-text">Vibes</h2>
          <Button onClick={() => setShowVibeModal(true)} size="sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Vibe
          </Button>
        </div>

        {project.vibes?.length === 0 ? (
          <Card className="text-center py-12">
            <svg className="w-12 h-12 text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <p className="text-muted">No vibes yet</p>
            <p className="text-sm text-muted mt-1">Create a vibe to start organizing your music</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {project.vibes?.map((vibe) => (
              <VibeCard
                key={vibe.id}
                vibe={vibe}
                onCreateCut={handleCreateCut}
                onDeleteCut={handleDeleteCut}
                onEditVibe={handleUpdateVibe}
                onDeleteVibe={handleDeleteVibe}
                onUploadImage={handleUploadVibeImage}
                onReorderCuts={handleReorderCuts}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Vibe Side Sheet */}
      <SideSheet
        isOpen={showVibeModal}
        onClose={() => {
          setShowVibeModal(false);
          setVibeForm({ name: '', theme: '', notes: '' });
          setError('');
        }}
        title="Create New Vibe"
        description="Add a new vibe to organize your music"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowVibeModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateVibe} isLoading={isSubmitting}>
              Create Vibe
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Vibe Name"
            placeholder="Enter vibe name"
            value={vibeForm.name}
            onChange={(e) => setVibeForm({ ...vibeForm, name: e.target.value })}
            error={error}
            autoFocus
          />
          <Input
            label="Theme (optional)"
            placeholder="e.g., Summer vibes, Dark ambient"
            value={vibeForm.theme}
            onChange={(e) => setVibeForm({ ...vibeForm, theme: e.target.value })}
          />
          <Textarea
            label="Notes (optional)"
            placeholder="Add any notes about this vibe..."
            value={vibeForm.notes}
            onChange={(e) => setVibeForm({ ...vibeForm, notes: e.target.value })}
            rows={3}
          />
        </div>
      </SideSheet>

      {/* Add Member Side Sheet */}
      <SideSheet
        isOpen={showMemberModal}
        onClose={() => {
          setShowMemberModal(false);
          setSelectedUserId('');
          setError('');
        }}
        title="Add Member"
        description="Select a user to add to this project"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowMemberModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddMember} isLoading={isSubmitting} disabled={!selectedUserId}>
              Add Member
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {availableUsers.length === 0 ? (
            <p className="text-muted text-center py-4">All users are already members of this project</p>
          ) : (
            <div className="space-y-2">
              {availableUsers.map((user) => (
                <label
                  key={user.id}
                  className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedUserId === user.id
                      ? 'bg-primary/10 border border-primary'
                      : 'bg-surface-light border border-transparent hover:border-border'
                  }`}
                >
                  <input
                    type="radio"
                    name="user"
                    value={user.id}
                    checked={selectedUserId === user.id}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="hidden"
                  />
                  <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center">
                    <span className="text-primary font-medium">
                      {user.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-text">{user.name}</p>
                    <p className="text-sm text-muted">{user.email}</p>
                  </div>
                </label>
              ))}
            </div>
          )}
          {error && <p className="text-error text-sm">{error}</p>}
        </div>
      </SideSheet>

      {/* Project Image Upload Side Sheet */}
      <ImageUploadSheet
        isOpen={showImageUpload}
        onClose={() => setShowImageUpload(false)}
        onUpload={handleImageUpload}
        title="Upload Project Image"
        description="Add a cover image for your project"
        currentImage={project.image}
      />
    </div>
  );
}
