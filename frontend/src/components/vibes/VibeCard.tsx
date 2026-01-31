import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Vibe } from '../../types';
import { Card, CardImage } from '../ui/Card';
import { ActionMenu } from '../ui/ActionMenu';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableCutItemProps {
  cut: any;
  index: number;
  onDelete: (cutId: string) => void;
}

function SortableCutItem({ cut, index, onDelete }: SortableCutItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: cut.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const firstAudioFile = cut.managedFiles?.[0];
  const creator = firstAudioFile?.uploadedBy;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-surface-light transition-colors ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-muted hover:text-text cursor-grab active:cursor-grabbing"
        title="Drag to reorder"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>
      <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
        <span className="text-primary text-sm font-bold">{index + 1}</span>
      </div>
      <div className="flex-1 min-w-0">
        <Link
          to={`/cuts/${cut.id}`}
          className="block"
        >
          <h4 className="font-medium text-text group-hover:text-primary transition-colors truncate">
            {cut.name}
          </h4>
        </Link>
        {creator && (
          <p className="text-xs text-muted truncate">
            by {creator.name}
          </p>
        )}
      </div>
      <div className="flex items-center gap-1">
        <Link
          to={`/cuts/${cut.id}`}
          className="p-1.5 text-muted hover:text-primary transition-colors"
          title="Open cut"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </Link>
        <button
          onClick={() => onDelete(cut.id)}
          className="p-1.5 text-muted hover:text-error transition-colors"
          title="Delete cut"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

interface VibeCardProps {
  vibe: Vibe;
  onCreateCut: (vibeId: string, name: string) => Promise<void>;
  onDeleteCut: (cutId: string) => Promise<void>;
  onEditVibe: (vibeId: string, data: { name?: string; theme?: string; notes?: string }) => Promise<void>;
  onDeleteVibe: (vibeId: string) => Promise<void>;
  onUploadImage: (vibeId: string, file: File) => Promise<void>;
  onReorderCuts: (vibeId: string, cutIds: string[]) => Promise<void>;
}

export function VibeCard({
  vibe,
  onCreateCut,
  onDeleteCut,
  onEditVibe,
  onDeleteVibe,
  onUploadImage,
  onReorderCuts,
}: VibeCardProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = vibe.cuts?.findIndex((cut) => cut.id === active.id) ?? -1;
      const newIndex = vibe.cuts?.findIndex((cut) => cut.id === over.id) ?? -1;

      if (oldIndex !== -1 && newIndex !== -1) {
        const newCuts = arrayMove(vibe.cuts || [], oldIndex, newIndex);
        const cutIds = newCuts.map(cut => cut.id);
        await onReorderCuts(vibe.id, cutIds);
      }
    }
  };
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddCutModal, setShowAddCutModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [cutName, setCutName] = useState('');
  const [editForm, setEditForm] = useState({
    name: vibe.name,
    theme: vibe.theme || '',
    notes: vibe.notes || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleAddCut = async () => {
    if (!cutName.trim()) {
      setError('Cut name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onCreateCut(vibe.id, cutName);
      setCutName('');
      setShowAddCutModal(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to create cut');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditVibe = async () => {
    if (!editForm.name.trim()) {
      setError('Vibe name is required');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await onEditVibe(vibe.id, editForm);
      setShowEditModal(false);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Failed to update vibe');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVibe = async () => {
    if (!confirm('Are you sure you want to delete this vibe and all its cuts?')) return;
    await onDeleteVibe(vibe.id);
  };

  const handleDeleteCut = async (cutId: string) => {
    if (!confirm('Are you sure you want to delete this cut?')) return;
    await onDeleteCut(cutId);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onUploadImage(vibe.id, file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const actionMenuItems = [
    {
      label: 'Add Cut',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      ),
      onClick: () => setShowAddCutModal(true),
    },
    {
      label: 'Edit Vibe',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      ),
      onClick: () => {
        setEditForm({
          name: vibe.name,
          theme: vibe.theme || '',
          notes: vibe.notes || '',
        });
        setShowEditModal(true);
      },
    },
    {
      label: 'Upload Image',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      onClick: () => fileInputRef.current?.click(),
    },
    {
      label: 'Delete Vibe',
      icon: (
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      ),
      onClick: handleDeleteVibe,
      variant: 'danger' as const,
    },
  ];

  return (
    <>
      <Card className="overflow-hidden">
        {/* Header with image and info */}
        <div className="flex gap-4">
          {/* Image */}
          <div className="w-32 h-32 flex-shrink-0 relative">
            <CardImage src={vibe.image} alt={vibe.name} className="!aspect-square h-full" />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 py-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="font-semibold text-lg text-text truncate">{vibe.name}</h3>
                {vibe.theme && (
                  <p className="text-sm text-primary truncate">{vibe.theme}</p>
                )}
              </div>
              <ActionMenu items={actionMenuItems} />
            </div>
            {vibe.notes && (
              <p className="text-sm text-muted mt-1 line-clamp-2">{vibe.notes}</p>
            )}
            <div className="flex items-center gap-4 mt-2 text-sm text-muted">
              <span>{vibe.cuts?.length || 0} cuts</span>
            </div>
          </div>
        </div>

        {/* Cuts Section */}
        <div className="mt-4 border-t border-border pt-4">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 text-sm font-medium text-muted hover:text-text transition-colors w-full"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Cuts ({vibe.cuts?.length || 0})
          </button>

          {isExpanded && (
            <div className="mt-3">
              {vibe.cuts?.length === 0 ? (
                <p className="text-sm text-muted py-2">No cuts yet. Add one to get started.</p>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={vibe.cuts?.map(cut => cut.id) || []}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {vibe.cuts?.map((cut, index) => (
                        <SortableCutItem
                          key={cut.id}
                          cut={cut}
                          index={index}
                          onDelete={handleDeleteCut}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              {/* Add Cut Button */}
              <button
                onClick={() => setShowAddCutModal(true)}
                className="flex items-center gap-2 w-full p-2 -mx-2 rounded-lg text-sm text-muted hover:text-primary hover:bg-surface-light transition-colors mt-2"
              >
                <div className="w-8 h-8 border-2 border-dashed border-current rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span>Add Cut</span>
              </button>
            </div>
          )}
        </div>
      </Card>

      {/* Add Cut Modal */}
      <Modal
        isOpen={showAddCutModal}
        onClose={() => {
          setShowAddCutModal(false);
          setCutName('');
          setError('');
        }}
        title="Add New Cut"
      >
        <div className="space-y-4">
          <Input
            label="Cut Name"
            placeholder="Enter cut name"
            value={cutName}
            onChange={(e) => setCutName(e.target.value)}
            error={error}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddCut();
            }}
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowAddCutModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCut} isLoading={isSubmitting}>
              Add Cut
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Vibe Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setError('');
        }}
        title="Edit Vibe"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Vibe Name"
            placeholder="Enter vibe name"
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            error={error}
            autoFocus
          />
          <Input
            label="Theme (optional)"
            placeholder="e.g., Summer vibes, Dark ambient"
            value={editForm.theme}
            onChange={(e) => setEditForm({ ...editForm, theme: e.target.value })}
          />
          <div>
            <label className="block text-sm font-medium text-text mb-1">
              Notes (optional)
            </label>
            <textarea
              placeholder="Add any notes about this vibe..."
              value={editForm.notes}
              onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text placeholder-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditVibe} isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
