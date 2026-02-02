'use client';

import * as React from 'react';
import { AnimatePresence, motion, type Transition } from 'motion/react';
import { cn } from '@/lib/utils';
import { getStrictContext } from '@/lib/getStrictContext';
import { Highlight, HighlightItem } from './Highlight';

// FileTree Context
type FileTreeContextValue = {
  value: string[];
  setValue: (value: string[] | ((prev: string[]) => string[])) => void;
  transition: Transition;
  maskClassName?: string;
  maskStyle?: React.CSSProperties;
  highlightClassName?: string;
  highlightStyle?: React.CSSProperties;
  highlightHover?: boolean;
};

const [FileTreeProvider, useFileTreeContext] =
  getStrictContext<FileTreeContextValue>('FileTree');

// Folder Context (for tracking expansion state)
type FolderContextValue = {
  id: string;
  isOpen: boolean;
  toggle: () => void;
};

const [FolderProvider, useFolderContext] =
  getStrictContext<FolderContextValue>('Folder');

// Root FileTree Component
export type FileTreeProps = {
  children?: React.ReactNode;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
  transition?: Transition;
  maskClassName?: string;
  maskStyle?: React.CSSProperties;
  highlightClassName?: string;
  highlightStyle?: React.CSSProperties;
  highlightHover?: boolean;
  className?: string;
};

function FileTree({
  children,
  value,
  defaultValue = [],
  onValueChange,
  transition = { type: 'spring', stiffness: 350, damping: 35 },
  maskClassName,
  maskStyle,
  highlightClassName,
  highlightStyle,
  highlightHover = true,
  className,
}: FileTreeProps) {
  // Use internal state
  const [internalValue, setInternalValue] = React.useState<string[]>(
    value !== undefined ? value : defaultValue
  );

  // Sync with controlled value
  React.useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  // Wrapper that supports functional updates and calls onChange
  const setValue = React.useCallback(
    (nextValue: string[] | ((prev: string[]) => string[])) => {
      if (typeof nextValue === 'function') {
        setInternalValue((prev) => {
          const newValue = nextValue(prev);
          onValueChange?.(newValue);
          return newValue;
        });
      } else {
        setInternalValue(nextValue);
        onValueChange?.(nextValue);
      }
    },
    [onValueChange]
  );

  return (
    <FileTreeProvider
      value={{
        value: internalValue,
        setValue,
        transition,
        maskClassName,
        maskStyle,
        highlightClassName,
        highlightStyle,
        highlightHover,
      }}
    >
      <div className={cn('w-full', className)}>
        {children}
      </div>
    </FileTreeProvider>
  );
}

// FileTree Highlight wrapper
export type FilesHighlightProps = {
  children?: React.ReactNode;
  className?: string;
};

function FilesHighlight({
  children,
  className,
}: FilesHighlightProps) {
  const { highlightClassName, highlightStyle, highlightHover } = useFileTreeContext();

  return (
    <Highlight
      mode="parent"
      hover={highlightHover}
      click={false}
      className={cn('rounded-md bg-surface-light', highlightClassName, className)}
      style={highlightStyle}
      controlledItems
    >
      {children}
    </Highlight>
  );
}

// Folder Item (collapsible folder)
export type FolderItemProps = {
  id: string;
  defaultOpen?: boolean;
  children?: React.ReactNode;
  className?: string;
};

function FolderItem({
  id,
  defaultOpen,
  children,
  className,
}: FolderItemProps) {
  const { value, setValue } = useFileTreeContext();
  const isOpen = value.includes(id);

  // Handle defaultOpen on initial mount
  React.useEffect(() => {
    if (defaultOpen) {
      setValue((prev) => prev.includes(id) ? prev : [...prev, id]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = React.useCallback(() => {
    console.log('[FileTree] Toggle called for:', id, 'current value:', value);
    setValue((prev) => {
      const newValue = prev.includes(id)
        ? prev.filter((v) => v !== id)
        : [...prev, id];
      console.log('[FileTree] New value:', newValue);
      return newValue;
    });
  }, [id, setValue, value]);

  return (
    <FolderProvider value={{ id, isOpen, toggle }}>
      <div
        data-state={isOpen ? 'open' : 'closed'}
        className={className}
      >
        {children}
      </div>
    </FolderProvider>
  );
}

// Folder Header (the clickable row)
export type FolderHeaderProps = {
  children?: React.ReactNode;
  className?: string;
};

function FolderHeader({
  children,
  className,
}: FolderHeaderProps) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

// Folder Trigger (button that toggles the folder)
export type FolderTriggerProps = {
  children?: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
};

function FolderTrigger({
  children,
  className,
  onClick,
}: FolderTriggerProps) {
  const { toggle, isOpen } = useFolderContext();

  return (
    <button
      type="button"
      data-state={isOpen ? 'open' : 'closed'}
      onClick={(e) => {
        console.log('[FolderTrigger] Button clicked');
        toggle();
        onClick?.(e);
      }}
      className={cn('flex items-center w-full text-left', className)}
    >
      {children}
    </button>
  );
}

// Folder Content (animated collapsible content)
export type FolderContentProps = {
  children?: React.ReactNode;
  className?: string;
  transition?: Transition;
  maskClassName?: string;
  maskStyle?: React.CSSProperties;
};

function FolderContent({
  children,
  className,
  transition: transitionProp,
  maskClassName: maskClassNameProp,
  maskStyle: maskStyleProp,
}: FolderContentProps) {
  const { isOpen } = useFolderContext();
  const context = useFileTreeContext();
  const transition = transitionProp ?? context.transition;
  const maskClassName = maskClassNameProp ?? context.maskClassName;
  const maskStyle = maskStyleProp ?? context.maskStyle;

  return (
    <AnimatePresence initial={false}>
      {isOpen && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={transition}
          className={cn('overflow-hidden', className)}
        >
          <div className="relative">
            {children}
            <motion.div
              className={cn(
                'pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-background to-transparent',
                maskClassName,
              )}
              style={{
                height: '30%',
                maxHeight: '40px',
                ...maskStyle,
              }}
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 1 }}
              transition={transition}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// File Highlight wrapper (for individual file items)
export type FileHighlightProps = {
  children: React.ReactElement;
  className?: string;
};

function FileHighlight({
  children,
  className,
}: FileHighlightProps) {
  return (
    <HighlightItem className={className}>
      {children}
    </HighlightItem>
  );
}

// File Item (non-collapsible file entry)
export type FileItemProps = {
  children?: React.ReactNode;
  className?: string;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
};

function FileItem({
  children,
  className,
  onClick,
}: FileItemProps) {
  return (
    <div className={cn('flex items-center', className)} onClick={onClick}>
      {children}
    </div>
  );
}

// File Icon wrapper
export type FileIconProps = {
  children?: React.ReactNode;
  className?: string;
};

function FileIcon({
  children,
  className,
}: FileIconProps) {
  return (
    <span className={cn('flex-shrink-0', className)}>
      {children}
    </span>
  );
}

// File Label
export type FileLabelProps = {
  children?: React.ReactNode;
  className?: string;
  title?: string;
};

function FileLabel({
  children,
  className,
  title,
}: FileLabelProps) {
  return (
    <span className={cn('truncate', className)} title={title}>
      {children}
    </span>
  );
}

// Folder Icon with animated open/closed state
export type FolderIconProps = {
  children?: React.ReactNode;
  className?: string;
  openIcon?: React.ReactNode;
  closedIcon?: React.ReactNode;
};

function FolderIcon({
  openIcon,
  closedIcon,
  className,
  children,
}: FolderIconProps) {
  const { isOpen } = useFolderContext();

  // If children are provided, use them directly
  if (children) {
    return (
      <span className={cn('flex-shrink-0', className)}>
        {children}
      </span>
    );
  }

  // Otherwise use the openIcon/closedIcon pattern
  return (
    <span className={cn('flex-shrink-0', className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isOpen ? 'open' : 'closed'}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.15 }}
        >
          {isOpen ? openIcon : closedIcon}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

// Chevron Icon with rotation animation
export type ChevronIconProps = {
  children?: React.ReactNode;
  className?: string;
  transition?: Transition;
};

function ChevronIcon({
  className,
  children,
  transition = { type: 'spring', stiffness: 350, damping: 35 },
}: ChevronIconProps) {
  const { isOpen } = useFolderContext();

  return (
    <motion.span
      className={cn('flex-shrink-0 inline-flex', className)}
      animate={{ rotate: isOpen ? 90 : 0 }}
      transition={transition}
    >
      {children ?? (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </motion.span>
  );
}

export {
  FileTree,
  FilesHighlight,
  FolderItem,
  FolderHeader,
  FolderTrigger,
  FolderContent,
  FileHighlight,
  FileItem,
  FileIcon,
  FileLabel,
  FolderIcon,
  ChevronIcon,
  useFileTreeContext,
  useFolderContext,
};
