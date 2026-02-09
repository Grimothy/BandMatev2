<!-- Context: standards/ui-components.md -->

# UI Component Standards

## Core Idea
Establish consistent UI component development practices using shadcn/ui as the foundation, with the 21st.dev Magic MCP server for component generation and discovery.

## Key Points
- **Component Library**: Use shadcn/ui components from `frontend/src/components/ui/`
- **MCP Integration**: Use `@21st-dev/magic` MCP for discovering and generating new shadcn components
- **Styling**: Tailwind CSS with CSS variables for theming (dark/light mode support)
- **Accessibility**: All components must be keyboard navigable and screen reader compatible
- **Consistency**: Follow existing component patterns and naming conventions

## Using the shadcn MCP (@21st-dev/magic)

When creating new UI components or needing shadcn/ui components:

1. **Search for components**: Use the MCP to find existing shadcn components that match your needs
2. **Generate components**: Use the MCP to generate new components with proper configuration
3. **Customize**: Adapt generated components to match BandMate's design system
4. **Location**: Place all shadcn/ui base components in `frontend/src/components/ui/`

### When to Use the MCP
- Adding a new shadcn/ui component not yet in the project
- Looking for component variants or examples
- Needing inspiration for complex component compositions
- Finding accessibility-compliant component patterns

### Component Customization
After generating a component via MCP:
1. Ensure it uses the project's CSS variables (`--primary`, `--secondary`, etc.)
2. Add any BandMate-specific variants
3. Update exports in component barrel files if needed

## Quick Example
```typescript
// Good: shadcn/ui component with project styling
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ActionButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  variant?: "default" | "destructive" | "outline";
  isLoading?: boolean;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  onClick,
  children,
  variant = "default",
  isLoading = false,
}) => (
  <Button
    variant={variant}
    onClick={onClick}
    disabled={isLoading}
    className={cn(isLoading && "opacity-50 cursor-not-allowed")}
  >
    {isLoading ? "Loading..." : children}
  </Button>
);
```

## Existing UI Components

Located in `frontend/src/components/ui/`:
- Button, Input, Label, Textarea
- Dialog, Sheet, Popover, Tooltip
- Card, Accordion, Tabs
- Select, Checkbox, Switch, Slider
- Avatar, Badge, Separator
- Sonner (toast notifications)
- ContextMenu, DropdownMenu

## Responsive Patterns

### Floating Action Button (FAB) + Drawer Pattern

**Use Case**: When you have a vertical list of content-heavy items (like audio files with waveforms) and need to provide access to a side panel (like comments) that would normally push content too far down on mobile.

**Implementation**:
- **Desktop (lg+)**: Sticky sidebar on the right (2/3 + 1/3 grid layout)
- **Mobile (<lg)**: Floating action button (FAB) that opens a bottom drawer sheet

**Example** (from `frontend/src/pages/cuts/CutDetail.tsx`):

```tsx
// Desktop: Two-column layout with sticky sidebar
<div className="lg:grid lg:grid-cols-3 lg:gap-6 lg:items-start">
  {/* Main content - left side */}
  <div className="lg:col-span-2 space-y-4">
    {/* Audio files, forms, etc. */}
  </div>

  {/* Sidebar - sticky on desktop, hidden on mobile */}
  <div className="hidden lg:block lg:col-span-1 lg:sticky lg:top-6">
    <CommentsSection {...props} />
  </div>
</div>

{/* Mobile: Floating Action Button */}
<button
  onClick={() => setIsDrawerOpen(true)}
  className="lg:hidden fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-primary text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
  aria-label="Open comments"
>
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
  </svg>
  {/* Optional badge for counts */}
  {count > 0 && (
    <span className="absolute -top-1 -right-1 w-6 h-6 bg-secondary text-white text-xs font-bold rounded-full flex items-center justify-center">
      {count}
    </span>
  )}
</button>

{/* Mobile: Bottom drawer using Sheet component */}
<Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
  <SheetContent side="bottom" className="h-[85vh] p-0">
    <SheetHeader className="p-6 pb-4 border-b border-border">
      <SheetTitle>Comments</SheetTitle>
    </SheetHeader>
    <SheetBody className="p-6">
      <CommentsSection {...props} />
    </SheetBody>
  </SheetContent>
</Sheet>
```

**Benefits**:
- ✅ Desktop: Side-by-side view, comments always visible while scrolling
- ✅ Mobile: Full screen for main content, quick access via FAB
- ✅ No deep scrolling required on mobile
- ✅ Natural gesture (swipe down to dismiss drawer)

**When to Use**:
- Content-heavy vertical lists (audio players, video timelines, long forms)
- Side panels with interactive elements (comments, chat, activity feeds)
- When scrolling distance would exceed 2-3 screen heights on mobile

## Reference
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [21st.dev Magic](https://21st.dev/magic) - MCP for component generation
- [Radix UI Primitives](https://www.radix-ui.com/) - Underlying primitives
- [Tailwind CSS](https://tailwindcss.com/docs)

## Related
- code-quality.md
- documentation.md

Codebase References
- frontend/src/components/ui/ (all base components)
- frontend/src/lib/utils.ts (cn utility function)
- frontend/tailwind.config.js (theme configuration)
- frontend/src/index.css (CSS variables)
