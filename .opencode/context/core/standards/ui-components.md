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
