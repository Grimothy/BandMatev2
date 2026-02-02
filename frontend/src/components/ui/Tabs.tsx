import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { motion, AnimatePresence, type Transition, type HTMLMotionProps } from "motion/react"
import { cn } from "@/lib/utils"
import { useControlledState } from "@/hooks/useControlledState"
import { Highlight, HighlightItem } from "@/components/animate-ui/Highlight"
import { AutoHeight } from "@/components/animate-ui/AutoHeight"
import { getStrictContext } from "@/lib/getStrictContext"

// Context for animated tabs
type AnimatedTabsContextType = {
  value: string | undefined;
  setValue: ((value: string) => void) | undefined;
};

const [AnimatedTabsProvider, useAnimatedTabs] = getStrictContext<AnimatedTabsContextType>('AnimatedTabsContext');

// Base shadcn Tabs components (non-animated)
const BaseTabs = TabsPrimitive.Root

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground",
      className
    )}
    {...props}
  />
))
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

// ============================================
// ANIMATED TABS COMPONENTS (animate-ui style)
// ============================================

type AnimatedTabsProps = React.ComponentProps<typeof TabsPrimitive.Root>;

function AnimatedTabs(props: AnimatedTabsProps) {
  const [value, setValue] = useControlledState({
    value: props.value,
    defaultValue: props.defaultValue,
    onChange: props.onValueChange,
  });

  return (
    <AnimatedTabsProvider value={{ value, setValue }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        {...props}
        onValueChange={setValue}
      />
    </AnimatedTabsProvider>
  );
}

type TabsHighlightProps = Omit<React.ComponentProps<typeof Highlight>, 'controlledItems' | 'value'> & {
  transition?: Transition;
};

function TabsHighlight({
  transition = { type: 'spring', stiffness: 200, damping: 25 },
  ...props
}: TabsHighlightProps) {
  const { value } = useAnimatedTabs();

  return (
    <Highlight
      data-slot="tabs-highlight"
      controlledItems
      value={value}
      transition={transition}
      click={false}
      {...props}
    />
  );
}

type TabsHighlightItemProps = React.ComponentProps<typeof HighlightItem> & {
  value: string;
};

function TabsHighlightItem(props: TabsHighlightItemProps) {
  return <HighlightItem data-slot="tabs-highlight-item" {...props} />;
}

type AnimatedTabsContentProps = React.ComponentProps<typeof TabsPrimitive.Content> &
  HTMLMotionProps<'div'>;

function AnimatedTabsContent({
  value,
  forceMount,
  transition = { duration: 0.5, ease: 'easeInOut' },
  className,
  ...props
}: AnimatedTabsContentProps) {
  return (
    <AnimatePresence mode="wait">
      <TabsPrimitive.Content asChild forceMount={forceMount} value={value}>
        <motion.div
          data-slot="tabs-content"
          layout
          layoutDependency={value}
          initial={{ opacity: 0, filter: 'blur(4px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(4px)' }}
          transition={transition}
          className={cn(
            "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            className
          )}
          {...props}
        />
      </TabsPrimitive.Content>
    </AnimatePresence>
  );
}

type TabsContentsMode = 'auto-height' | 'layout';

type TabsContentsProps = {
  mode?: TabsContentsMode;
  children: React.ReactNode;
  transition?: Transition;
  className?: string;
  style?: React.CSSProperties;
};

const defaultContentsTransition: Transition = {
  type: 'spring',
  stiffness: 200,
  damping: 30,
};

function TabsContents({
  mode = 'auto-height',
  transition = defaultContentsTransition,
  children,
  className,
  style,
  ...props
}: TabsContentsProps) {
  const { value } = useAnimatedTabs();

  if (mode === 'auto-height') {
    return (
      <AutoHeight
        data-slot="tabs-contents"
        deps={[value]}
        transition={transition}
        className={className}
        style={style}
        {...props}
      >
        {children}
      </AutoHeight>
    );
  }

  return (
    <motion.div
      data-slot="tabs-contents"
      layout="size"
      layoutDependency={value}
      style={{ overflow: 'hidden', ...style }}
      transition={{ layout: transition }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// ============================================
// ENHANCED TABS (backward-compatible API with animations)
// ============================================

export interface Tab {
  id: string
  label: string
  icon?: React.ReactNode
  badge?: number | string
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onChange: (tabId: string) => void
  className?: string
  /** Enable animated highlight effect on active tab */
  animated?: boolean
}

function Tabs({ tabs, activeTab, onChange, className = '', animated = true }: TabsProps) {
  const layoutId = React.useId();
  
  if (!animated) {
    // Non-animated version (original behavior)
    return (
      <BaseTabs value={activeTab} onValueChange={onChange} className={className}>
        <TabsList className="bg-secondary border-b border-border rounded-none w-full justify-start h-auto p-0">
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "relative px-4 py-2.5 text-sm font-medium rounded-t-lg rounded-b-none transition-colors",
                "data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-none",
                "data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:-mb-px",
                "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground"
              )}
            >
              <span className="flex items-center gap-2">
                {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
                {tab.label}
                {tab.badge !== undefined && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center px-1.5 py-0.5 text-xs rounded-full",
                      activeTab === tab.id
                        ? 'bg-primary/20 text-primary'
                        : 'bg-secondary text-muted-foreground'
                    )}
                  >
                    {tab.badge}
                  </span>
                )}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </BaseTabs>
    )
  }

  // Animated version with sliding highlight
  return (
    <BaseTabs value={activeTab} onValueChange={onChange} className={className}>
      <TabsList className="bg-secondary border-b border-border rounded-none w-full justify-start h-auto p-0 relative">
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium rounded-t-lg rounded-b-none transition-colors z-10",
              "data-[state=active]:text-primary data-[state=active]:shadow-none",
              "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:text-foreground",
              "data-[state=active]:bg-transparent" // Remove default bg for animated version
            )}
          >
            {/* Animated highlight background */}
            {activeTab === tab.id && (
              <motion.div
                layoutId={`tab-highlight-${layoutId}`}
                className="absolute inset-0 bg-card rounded-t-lg border-b-2 border-primary -mb-px"
                style={{ zIndex: -1 }}
                transition={{
                  type: "spring",
                  stiffness: 350,
                  damping: 30,
                }}
              />
            )}
            <span className="flex items-center gap-2 relative z-10">
              {tab.icon && <span className="w-4 h-4">{tab.icon}</span>}
              {tab.label}
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    "inline-flex items-center justify-center px-1.5 py-0.5 text-xs rounded-full transition-colors",
                    activeTab === tab.id
                      ? 'bg-primary/20 text-primary'
                      : 'bg-secondary text-muted-foreground'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </span>
          </TabsTrigger>
        ))}
      </TabsList>
    </BaseTabs>
  )
}

interface TabPanelProps {
  id: string
  activeTab: string
  children: React.ReactNode
  className?: string
  /** Enable animated content transitions */
  animated?: boolean
}

function TabPanel({ id, activeTab, children, className = '', animated = true }: TabPanelProps) {
  if (id !== activeTab) return null
  
  if (!animated) {
    return (
      <div
        role="tabpanel"
        id={`tabpanel-${id}`}
        aria-labelledby={`tab-${id}`}
        className={className}
      >
        {children}
      </div>
    )
  }

  return (
    <motion.div
      role="tabpanel"
      id={`tabpanel-${id}`}
      aria-labelledby={`tab-${id}`}
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 30,
      }}
    >
      {children}
    </motion.div>
  )
}

// Export all components
export { 
  // Original components
  Tabs, 
  TabPanel, 
  BaseTabs, 
  TabsList, 
  TabsTrigger, 
  TabsContent,
  // Animated components (animate-ui style)
  AnimatedTabs,
  TabsHighlight,
  TabsHighlightItem,
  AnimatedTabsContent,
  TabsContents,
}
