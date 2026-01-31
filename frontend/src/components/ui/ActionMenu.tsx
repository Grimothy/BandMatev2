import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './dropdown-menu';

export interface ActionMenuItem {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  /** Hide this item if false */
  visible?: boolean;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  className?: string;
}

export function ActionMenu({ items, className = '' }: ActionMenuProps) {
  // Filter items based on visibility (default to true if not specified)
  const visibleItems = items.filter(item => item.visible !== false);

  // Don't render menu if no visible items
  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={`p-2 text-muted hover:text-text hover:bg-surface-light rounded-lg transition-colors ${className}`}
          aria-label="Actions menu"
          onClick={(e) => e.preventDefault()}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
          </svg>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48 bg-surface border-border">
        {visibleItems.map((item) => (
          <DropdownMenuItem
            key={item.label}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              item.onClick();
            }}
            className={`flex items-center gap-3 cursor-pointer ${
              item.variant === 'danger'
                ? 'text-error focus:text-error focus:bg-error/10'
                : 'text-text focus:bg-surface-light'
            }`}
          >
            {item.icon && <span className="w-4 h-4">{item.icon}</span>}
            <span className="text-sm">{item.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
