---
source: Context7 API + Official Docs (docs.dndkit.com)
library: @dnd-kit/core
package: @dnd-kit/core
topic: best-practices-code-review
fetched: 2026-02-09T00:00:00Z
official_docs: https://docs.dndkit.com
---

# @dnd-kit/core Best Practices for Code Review

## 1. DndContext Best Practices

### Proper Setup
```jsx
import {DndContext} from '@dnd-kit/core';

function App() {
  return (
    <DndContext
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      collisionDetection={closestCenter} // Choose appropriate algorithm
      sensors={sensors} // Define sensors explicitly
    >
      {/* Draggable/Droppable components */}
    </DndContext>
  );
}
```

### ✅ Code Review Checklist - DndContext
- [ ] DndContext wraps all draggable/droppable components
- [ ] Event handlers (`onDragStart`, `onDragEnd`, `onDragOver`, `onDragCancel`) are defined
- [ ] Collision detection algorithm is explicitly chosen (not relying on default if needed)
- [ ] Sensors are configured appropriately for the use case
- [ ] Nested DndContext providers are intentional (they create isolated drag contexts)
- [ ] `layoutMeasuring` strategy is set if dealing with dynamic layouts

### Nesting Warning
When nesting `DndContext` providers:
- `useDroppable` and `useDraggable` hooks only access nodes within their context
- Events bubble like DOM events - first activated sensor captures the event

---

## 2. useDroppable Hook Implementation

### Correct Implementation
```jsx
import {useDroppable} from '@dnd-kit/core';

function Droppable({id, children}) {
  const {setNodeRef, isOver, active} = useDroppable({
    id: id, // MUST be unique
    data: {
      // Optional: custom data accessible in event handlers
      accepts: ['type-a', 'type-b'],
    },
  });
  
  return (
    <div ref={setNodeRef}>
      {children}
    </div>
  );
}
```

### ✅ Code Review Checklist - useDroppable
- [ ] Each droppable has a **unique `id`**
- [ ] `setNodeRef` is attached to a DOM element
- [ ] One droppable = one ref (don't attach single droppable to multiple elements)
- [ ] Dynamic lists use reusable Droppable component pattern
- [ ] `data` prop used for custom metadata (e.g., accepted types)

### Common Anti-patterns
```jsx
// ❌ BAD: Same ID for multiple droppables
<Droppable id="same-id" /> // Will cause conflicts
<Droppable id="same-id" />

// ❌ BAD: No ref attached
function BadDroppable() {
  const {setNodeRef} = useDroppable({id: 'test'});
  return <div>Not registered!</div>; // Missing ref={setNodeRef}
}
```

---

## 3. DragOverlay Usage Patterns

### When to Use DragOverlay
Use `<DragOverlay>` when:
- Showing preview of drop location while dragging
- Moving items between containers during drag
- Draggable is in a scrollable container
- Using virtualized lists
- You want smooth drop animations

### Correct Implementation
```jsx
import {DndContext, DragOverlay} from '@dnd-kit/core';

function App() {
  const [activeId, setActiveId] = useState(null);
  
  return (
    <DndContext 
      onDragStart={({active}) => setActiveId(active.id)}
      onDragEnd={() => setActiveId(null)}
    >
      {items.map(item => (
        <DraggableItem key={item.id} {...item} />
      ))}
      
      {/* DragOverlay MUST remain mounted at all times */}
      <DragOverlay>
        {activeId ? <Item id={activeId} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
```

### ✅ Code Review Checklist - DragOverlay
- [ ] `<DragOverlay>` is **always mounted** (conditionally render children, NOT the component)
- [ ] Rendered outside of draggable components
- [ ] Children don't use `useDraggable` hook
- [ ] Uses presentational component pattern (separate drag logic from presentation)
- [ ] `wrapperElement` matches child element type (e.g., `ul` for `li` items)
- [ ] Modifiers applied if movement restriction needed
- [ ] `dropAnimation` configured or set to `null` if disabled

### Common Anti-patterns
```jsx
// ❌ BAD: Conditionally rendering DragOverlay (breaks drop animation)
{isDragging && <DragOverlay><Item /></DragOverlay>}

// ✅ GOOD: Conditionally render children
<DragOverlay>
  {isDragging ? <Item /> : null}
</DragOverlay>
```

---

## 4. Performance Optimization

### Key Performance Principles

1. **Minimize DOM Mutations**: Use CSS transforms (`translate3d`, `scale`) instead of changing layout properties
2. **Lazy Layout Calculation**: dnd-kit calculates positions only when drag starts
3. **Synthetic Event Listeners**: Uses React's SyntheticEvent for activators (better than manual event listeners)
4. **Ignore Transforms by Default**: Transforms on nodes are ignored to prevent collision calculation interference

### ✅ Code Review Checklist - Performance
- [ ] Using CSS `transform` property for visual updates during drag (not `top`/`left`)
- [ ] Not forcing re-renders during drag operations
- [ ] `layoutMeasuring` strategy set appropriately:
  - `WhileDragging` (default): Measures only after drag starts
  - `BeforeDragging`: Measures before drag and after it ends
  - `Always`: Measures before, during start, and after
- [ ] Memoizing event handlers with `useCallback`
- [ ] Memoizing sensors array with `useMemo`
- [ ] Not creating new objects/arrays in render for props

### Performance Anti-patterns
```jsx
// ❌ BAD: Creating new sensor array every render
<DndContext sensors={[PointerSensor, KeyboardSensor]}>

// ✅ GOOD: Memoize sensors
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor)
);
<DndContext sensors={sensors}>
```

---

## 5. Event Handlers (onDragStart, onDragEnd, onDragOver)

### Event Handler Signatures
```typescript
interface DragStartEvent {
  active: {
    id: UniqueIdentifier;
    data: DataRef;
    rect: ViewRect;
  };
}

interface DragOverEvent extends DragStartEvent {
  over: {
    id: UniqueIdentifier;
    rect: ViewRect;
    data: DataRef;
  } | null;
}

interface DragEndEvent extends DragOverEvent {}
```

### Critical Understanding
> **`onDragEnd` does NOT move items** - it provides information about the drop.
> The consumer must update state to reflect the change.

### Correct Pattern
```jsx
function handleDragEnd(event) {
  const {active, over} = event;
  
  if (!over) return; // Dropped outside any droppable
  
  if (active.id !== over.id) {
    setItems((items) => {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      return arrayMove(items, oldIndex, newIndex);
    });
  }
}
```

### ✅ Code Review Checklist - Event Handlers
- [ ] `onDragEnd` checks if `over` is null before accessing properties
- [ ] State updates are immutable
- [ ] `onDragCancel` resets any temporary state
- [ ] `active.data` and `over.data` used for type checking/validation
- [ ] For sortable with variable sizes: re-order in `onDragOver`, not just `onDragEnd`
- [ ] Event handlers are memoized with `useCallback`

---

## 6. Collision Detection Strategies

### Built-in Algorithms

| Algorithm | Use Case | Description |
|-----------|----------|-------------|
| `rectIntersection` (default) | General use | Requires rectangles to intersect |
| `closestCenter` | Sortable lists | Finds droppable with center closest to draggable's center |
| `closestCorners` | Kanban/stacked containers | Measures distance between all four corners |
| `pointerWithin` | High precision | Only registers when pointer is inside droppable |

### Choosing the Right Algorithm
```jsx
import {
  DndContext,
  closestCenter,      // For sortable lists
  closestCorners,     // For Kanban boards
  rectIntersection,   // Default, strict intersection
  pointerWithin,      // Pointer-based, high precision
} from '@dnd-kit/core';

// Kanban board example
<DndContext collisionDetection={closestCorners}>
```

### Custom Collision Detection (Composition)
```javascript
import {pointerWithin, rectIntersection} from '@dnd-kit/core';

function customCollisionDetection(args) {
  const pointerCollisions = pointerWithin(args);
  
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  
  // Fallback for keyboard navigation
  return rectIntersection(args);
}
```

### ✅ Code Review Checklist - Collision Detection
- [ ] Algorithm chosen matches the UI pattern:
  - Simple drag-drop: `rectIntersection`
  - Sortable lists: `closestCenter`
  - Kanban/nested containers: `closestCorners`
  - High precision: `pointerWithin` (with fallback!)
- [ ] If using `pointerWithin`, has fallback for keyboard navigation
- [ ] Custom algorithms handle edge cases (empty arrays, null values)
- [ ] For mixed container types, uses composition pattern

---

## 7. Accessibility Checklist

### ✅ Code Review Checklist - Accessibility
- [ ] Custom `announcements` provided for screen readers
- [ ] `screenReaderInstructions` customized for the use case
- [ ] Keyboard navigation works (Keyboard sensor configured)
- [ ] Focus management handled properly
- [ ] ARIA attributes not conflicting with dnd-kit's built-in ones

### Announcements Example
```jsx
const announcements = {
  onDragStart({active}) {
    return `Picked up ${active.data.current?.label || active.id}`;
  },
  onDragOver({active, over}) {
    if (over) {
      return `${active.id} is over ${over.id}`;
    }
    return `${active.id} is no longer over a drop zone`;
  },
  onDragEnd({active, over}) {
    if (over) {
      return `${active.id} was dropped on ${over.id}`;
    }
    return `${active.id} was dropped`;
  },
  onDragCancel({active}) {
    return `Dragging cancelled. ${active.id} was dropped`;
  },
};

<DndContext announcements={announcements}>
```

---

## Quick Reference: Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| Drop animation doesn't work | `<DragOverlay>` conditionally rendered | Always render `<DragOverlay>`, conditionally render children |
| Race conditions on mount/unmount | Missing unique key | Ensure unique `id` for all draggables/droppables |
| Collision detection seems wrong | Using `closestCenter` with stacked containers | Switch to `closestCorners` for Kanban-style layouts |
| Keyboard doesn't work with `pointerWithin` | No fallback collision algorithm | Compose `pointerWithin` with `rectIntersection` |
| Item moves on drag start | Transform not applied correctly | Ensure using CSS `transform` property |
| Items in scrollable container jump | Not using `<DragOverlay>` | Use `<DragOverlay>` for scrollable containers |
