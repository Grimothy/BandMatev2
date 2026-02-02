import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getProjects, createProject, deleteProject, updateProject, uploadProjectImage } from '../../api/projects';
import { Project } from '../../types';
import { Button } from '../../components/ui/Button';
import { Card, CardImage } from '../../components/ui/Card';
import { SideSheet } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Loading } from '../../components/ui/Loading';
import { ActionMenu } from '../../components/ui/ActionMenu';
import { ImageUploadSheet } from '../../components/files/ImageUploadSheet';

export function ProjectList() {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  
  // Edit project state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState('');
  
  // Image upload state
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [imageUploadProject, setImageUploadProject] = useState<Project | null>(null);

  const fetchProjects = async () => {
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async () => {
    if (!newProjectName.trim()) {
      setError('Project name is required');
      return;
    }

    setIsCreating(true);
    setError('');

    try {
      await createProject(newProjectName);
      setNewProjectName('');
      setShowCreateModal(false);
      fetchProjects();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteProject(id);
      fetchProjects();
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  };

  const handleEdit = async () => {
    if (!editingProject || !editProjectName.trim()) {
      setEditError('Project name is required');
      return;
    }

    setIsEditing(true);
    setEditError('');

    try {
      await updateProject(editingProject.id, editProjectName);
      setShowEditModal(false);
      setEditingProject(null);
      setEditProjectName('');
      fetchProjects();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setEditError(error.response?.data?.error || 'Failed to update project');
    } finally {
      setIsEditing(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!imageUploadProject) return;
    await uploadProjectImage(imageUploadProject.id, file);
    fetchProjects();
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setEditProjectName(project.name);
    setEditError('');
    setShowEditModal(true);
  };

  const openImageUpload = (project: Project) => {
    setImageUploadProject(project);
    setShowImageUpload(true);
  };

  const getActionMenuItems = (project: Project) => [
    {
      label: 'Edit Project',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      onClick: () => openEditModal(project),
    },
    {
      label: 'Upload Image',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      onClick: () => openImageUpload(project),
    },
    {
      label: 'Delete Project',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      onClick: () => handleDelete(project.id),
      variant: 'danger' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-text">Projects</h1>
          <p className="text-muted mt-1">Manage your music collaboration projects</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowCreateModal(true)}>
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Project
          </Button>
        )}
      </div>

      {/* Project Grid */}
      {isLoading ? (
        <Loading className="py-12" />
      ) : projects.length === 0 ? (
        <Card className="text-center py-12">
          <svg className="w-12 h-12 text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <p className="text-muted mb-4">No projects yet</p>
          {isAdmin && (
            <Button onClick={() => setShowCreateModal(true)}>Create your first project</Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Card key={project.id} className="group relative">
              <Link to={`/projects/${project.id}`}>
                <CardImage src={project.image} alt={project.name} />
                <h3 className="mt-3 font-semibold text-text group-hover:text-primary transition-colors">
                  {project.name}
                </h3>
                <p className="text-sm text-muted">
                  {project.members?.length || 0} members • {project.vibes?.length || 0} vibes
                </p>
              </Link>
              
              {isAdmin && (
                <ActionMenu 
                  items={getActionMenuItems(project)} 
                  className="absolute top-2 right-2 bg-surface/80 rounded-lg"
                />
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <SideSheet
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setNewProjectName('');
          setError('');
        }}
        title="Create New Project"
        description="Start a new music collaboration project"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} isLoading={isCreating}>
              Create Project
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Project Name"
            placeholder="Enter project name"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            error={error}
            autoFocus
          />
        </div>
      </SideSheet>

      {/* Edit Modal */}
      <SideSheet
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingProject(null);
          setEditProjectName('');
          setEditError('');
        }}
        title="Edit Project"
        description="Update project details"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} isLoading={isEditing}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Project Name"
            placeholder="Enter project name"
            value={editProjectName}
            onChange={(e) => setEditProjectName(e.target.value)}
            error={editError}
            autoFocus
          />
        </div>
      </SideSheet>

      {/* Image Upload */}
      <ImageUploadSheet
        isOpen={showImageUpload}
        onClose={() => {
          setShowImageUpload(false);
          setImageUploadProject(null);
        }}
        onUpload={handleImageUpload}
        title="Upload Project Image"
        description={imageUploadProject ? `Add a cover image for "${imageUploadProject.name}"` : 'Add a cover image'}
        currentImage={imageUploadProject?.image}
      />
    </div>
  );
}
