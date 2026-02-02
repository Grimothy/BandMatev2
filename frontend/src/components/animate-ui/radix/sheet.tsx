'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AnimatePresence, motion, type HTMLMotionProps, type Transition } from 'motion/react';

import { getStrictContext } from '@/lib/getStrictContext';
import { useControlledState } from '@/hooks/useControlledState';

type SheetContextType = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
};

const [SheetProvider, useSheet] =
  getStrictContext<SheetContextType>('SheetContext');

type SheetProps = React.ComponentProps<typeof DialogPrimitive.Root>;

function Sheet(props: SheetProps) {
  const [isOpen, setIsOpen] = useControlledState({
    value: props.open,
    defaultValue: props.defaultOpen,
    onChange: props.onOpenChange,
  });

  return (
    <SheetProvider value={{ isOpen, setIsOpen }}>
      <DialogPrimitive.Root
        data-slot="sheet"
        {...props}
        open={isOpen}
        onOpenChange={setIsOpen}
      />
    </SheetProvider>
  );
}

type SheetTriggerProps = React.ComponentProps<typeof DialogPrimitive.Trigger>;

function SheetTrigger(props: SheetTriggerProps) {
  return <DialogPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

type SheetCloseProps = React.ComponentProps<typeof DialogPrimitive.Close>;

function SheetClose(props: SheetCloseProps) {
  return <DialogPrimitive.Close data-slot="sheet-close" {...props} />;
}

type SheetPortalProps = React.ComponentProps<typeof DialogPrimitive.Portal>;

function SheetPortal(props: SheetPortalProps) {
  const { isOpen } = useSheet();

  return (
    <AnimatePresence>
      {isOpen && (
        <DialogPrimitive.Portal forceMount data-slot="sheet-portal" {...props} />
      )}
    </AnimatePresence>
  );
}

type SheetOverlayProps = Omit<
  React.ComponentProps<typeof DialogPrimitive.Overlay>,
  'asChild' | 'forceMount'
> &
  HTMLMotionProps<'div'> & {
    transition?: Transition;
  };

function SheetOverlay({
  transition = { duration: 0.2, ease: 'easeInOut' },
  ...props
}: SheetOverlayProps) {
  return (
    <DialogPrimitive.Overlay asChild forceMount>
      <motion.div
        key="sheet-overlay"
        data-slot="sheet-overlay"
        initial={{ opacity: 0, filter: 'blur(4px)' }}
        animate={{ opacity: 1, filter: 'blur(0px)' }}
        exit={{ opacity: 0, filter: 'blur(4px)' }}
        transition={transition}
        {...props}
      />
    </DialogPrimitive.Overlay>
  );
}

type Side = 'top' | 'bottom' | 'left' | 'right';

type SheetContentProps = Omit<
  React.ComponentProps<typeof DialogPrimitive.Content>,
  'asChild' | 'forceMount'
> &
  HTMLMotionProps<'div'> & {
    side?: Side;
    transition?: Transition;
  };

function SheetContent({
  side = 'right',
  transition = { type: 'spring', stiffness: 150, damping: 22 },
  style,
  children,
  ...props
}: SheetContentProps) {
  const axis = side === 'left' || side === 'right' ? 'x' : 'y';

  const offscreen: Record<Side, { x?: string; y?: string; opacity: number }> = {
    right: { x: '100%', opacity: 0 },
    left: { x: '-100%', opacity: 0 },
    top: { y: '-100%', opacity: 0 },
    bottom: { y: '100%', opacity: 0 },
  };

  const positionStyle: Record<Side, React.CSSProperties> = {
    right: { insetBlock: 0, right: 0 },
    left: { insetBlock: 0, left: 0 },
    top: { insetInline: 0, top: 0 },
    bottom: { insetInline: 0, bottom: 0 },
  };

  return (
    <DialogPrimitive.Content asChild forceMount {...props}>
      <motion.div
        key="sheet-content"
        data-slot="sheet-content"
        data-side={side}
        initial={offscreen[side]}
        animate={{ [axis]: 0, opacity: 1 }}
        exit={offscreen[side]}
        style={{
          position: 'fixed',
          ...positionStyle[side],
          ...style,
        }}
        transition={transition}
      >
        {children}
      </motion.div>
    </DialogPrimitive.Content>
  );
}

type SheetHeaderProps = React.ComponentProps<'div'>;

function SheetHeader(props: SheetHeaderProps) {
  return <div data-slot="sheet-header" {...props} />;
}

type SheetFooterProps = React.ComponentProps<'div'>;

function SheetFooter(props: SheetFooterProps) {
  return <div data-slot="sheet-footer" {...props} />;
}

type SheetTitleProps = React.ComponentProps<typeof DialogPrimitive.Title>;

function SheetTitle(props: SheetTitleProps) {
  return <DialogPrimitive.Title data-slot="sheet-title" {...props} />;
}

type SheetDescriptionProps = React.ComponentProps<typeof DialogPrimitive.Description>;

function SheetDescription(props: SheetDescriptionProps) {
  return (
    <DialogPrimitive.Description data-slot="sheet-description" {...props} />
  );
}

export {
  useSheet,
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  type SheetProps,
  type SheetPortalProps,
  type SheetOverlayProps,
  type SheetTriggerProps,
  type SheetCloseProps,
  type SheetContentProps,
  type SheetHeaderProps,
  type SheetFooterProps,
  type SheetTitleProps,
  type SheetDescriptionProps,
};
