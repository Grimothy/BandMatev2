---
source: Official Docs
library: Radix UI
package: @radix-ui/react-dropdown-menu, @radix-ui/react-context-menu
topic: action-menus
fetched: 2026-01-30
official_docs: https://www.radix-ui.com/primitives/docs/components/dropdown-menu, https://www.radix-ui.com/primitives/docs/components/context-menu
---

# Implementing Action Menus in React/Next.js with Radix UI

## Dropdown Menu

Displays a menu triggered by a button, suitable for action menus on project cards.

### Features
- Can be controlled or uncontrolled.
- Supports submenus.
- Supports items, labels, groups, checkable items.
- Customizable positioning and collision handling.
- Full keyboard navigation and accessibility.

### Installation
```bash
npm install @radix-ui/react-dropdown-menu
```

### Anatomy
```jsx
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

<DropdownMenu.Root>
  <DropdownMenu.Trigger />
  <DropdownMenu.Portal>
    <DropdownMenu.Content>
      <DropdownMenu.Item />
      {/* Other parts */}
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
```

### Key API
- **Root**: `open`, `onOpenChange` for controlled state; `modal` (default true).
- **Trigger**: Button to open menu.
- **Content**: `side` (default "bottom"), `align` (default "center"), `sideOffset`, `avoidCollisions`.
- **Item**: Menu items with `onSelect`.
- Supports CheckboxItem, RadioGroup, Sub for advanced menus.

### Examples
#### Basic Dropdown
```jsx
<DropdownMenu.Root>
  <DropdownMenu.Trigger asChild>
    <button>Actions</button>
  </DropdownMenu.Trigger>
  <DropdownMenu.Portal>
    <DropdownMenu.Content>
      <DropdownMenu.Item>Edit</DropdownMenu.Item>
      <DropdownMenu.Item>Delete</DropdownMenu.Item>
    </DropdownMenu.Content>
  </DropdownMenu.Portal>
</DropdownMenu.Root>
```

#### With Checkbox Items
```jsx
const [checked, setChecked] = useState(false);

<DropdownMenu.CheckboxItem checked={checked} onCheckedChange={setChecked}>
  <DropdownMenu.ItemIndicator>✓</DropdownMenu.ItemIndicator>
  Option
</DropdownMenu.CheckboxItem>
```

#### With Submenus
Use `DropdownMenu.Sub` for nested menus.

### Accessibility
Adheres to Menu Button WAI-ARIA pattern. Keyboard: Space/Enter to open/activate, Arrow keys to navigate, Esc to close.

## Context Menu

Displays a menu at the pointer, triggered by right-click, ideal for context actions on cards.

### Features
- Triggered by right-click or long press.
- Similar to dropdown but positioned at cursor.
- Supports all menu types.

### Installation
```bash
npm install @radix-ui/react-context-menu
```

### Anatomy
```jsx
import * as ContextMenu from "@radix-ui/react-context-menu";

<ContextMenu.Root>
  <ContextMenu.Trigger>Right-click here</ContextMenu.Trigger>
  <ContextMenu.Portal>
    <ContextMenu.Content>
      <ContextMenu.Item />
    </ContextMenu.Content>
  </ContextMenu.Portal>
</ContextMenu.Root>
```

### Key API
- **Root**: `onOpenChange`, `modal`.
- **Trigger**: Wrap the card or element.
- **Content**: `alignOffset`, collision props.
- Same item types as dropdown.

### Examples
#### Basic Context Menu on Card
```jsx
<ContextMenu.Root>
  <ContextMenu.Trigger className="card">
    Project Card
  </ContextMenu.Trigger>
  <ContextMenu.Portal>
    <ContextMenu.Content>
      <ContextMenu.Item>View</ContextMenu.Item>
      <ContextMenu.Item>Edit</ContextMenu.Item>
      <ContextMenu.Separator />
      <ContextMenu.Item>Delete</ContextMenu.Item>
    </ContextMenu.Content>
  </ContextMenu.Portal>
</ContextMenu.Root>
```

### Accessibility
Uses roving tabindex. Keyboard: Shift+F10 to open, same navigation as dropdown.

## Best Practices for Card Components with Actions
- Use DropdownMenu for explicit action buttons (e.g., three-dot menu).
- Use ContextMenu for right-click actions on the card itself.
- Wrap cards with ContextMenu.Trigger for context menus.
- Use `modal: true` to trap focus.
- Position with `sideOffset` for spacing.
- Style with Tailwind or CSS using data attributes like `[data-state="open"]`.
- For state management: Uncontrolled by default; use `open`/`onOpenChange` if needed to sync with app state.
- Ensure actions are accessible; use `aria-label` on triggers.

## Positioning and Styling
- **Positioning**: Customize `side`, `align`, `sideOffset` (e.g., 5px). `avoidCollisions: true` prevents overflow.
- **Styling**: Apply classes to parts. Use CSS variables for animations (e.g., `--radix-dropdown-menu-content-transform-origin`).
- **Animations**: Add scale or slide animations based on `data-side`.

## UI Libraries
Radix UI provides unstyled primitives. Pair with Shadcn/ui for styled components or Tailwind for custom styling. Alternative: Headless UI (similar API).