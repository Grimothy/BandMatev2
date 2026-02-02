import * as React from 'react';
import { X } from 'lucide-react';

import {
  Sheet as SheetPrimitive,
  SheetTrigger as SheetTriggerPrimitive,
  SheetOverlay as SheetOverlayPrimitive,
  SheetClose as SheetClosePrimitive,
  SheetPortal as SheetPortalPrimitive,
  SheetContent as SheetContentPrimitive,
  SheetHeader as SheetHeaderPrimitive,
  SheetFooter as SheetFooterPrimitive,
  SheetTitle as SheetTitlePrimitive,
  SheetDescription as SheetDescriptionPrimitive,
  type SheetProps as SheetPrimitiveProps,
  type SheetTriggerProps as SheetTriggerPrimitiveProps,
  type SheetOverlayProps as SheetOverlayPrimitiveProps,
  type SheetCloseProps as SheetClosePrimitiveProps,
  type SheetContentProps as SheetContentPrimitiveProps,
  type SheetHeaderProps as SheetHeaderPrimitiveProps,
  type SheetFooterProps as SheetFooterPrimitiveProps,
  type SheetTitleProps as SheetTitlePrimitiveProps,
  type SheetDescriptionProps as SheetDescriptionPrimitiveProps,
} from '@/components/animate-ui/radix/sheet';
import { cn } from '@/lib/utils';

type SheetProps = SheetPrimitiveProps;

function Sheet(props: SheetProps) {
  return <SheetPrimitive {...props} />;
}

type SheetTriggerProps = SheetTriggerPrimitiveProps;

function SheetTrigger(props: SheetTriggerProps) {
  return <SheetTriggerPrimitive {...props} />;
}

type SheetOverlayProps = SheetOverlayPrimitiveProps;

function SheetOverlay({ className, ...props }: SheetOverlayProps) {
  return (
    <SheetOverlayPrimitive
      className={cn('fixed inset-0 z-50 bg-black/80', className)}
      {...props}
    />
  );
}

type SheetCloseProps = SheetClosePrimitiveProps;

function SheetClose(props: SheetCloseProps) {
  return <SheetClosePrimitive {...props} />;
}

type SheetContentProps = SheetContentPrimitiveProps & {
  showCloseButton?: boolean;
};

function SheetContent({
  className,
  children,
  side = 'right',
  showCloseButton = true,
  ...props
}: SheetContentProps) {
  return (
    <SheetPortalPrimitive>
      <SheetOverlay />
      <SheetContentPrimitive
        className={cn(
          'bg-card border-border fixed z-50 flex flex-col gap-4 shadow-lg',
          side === 'right' && 'h-full w-full sm:w-[450px] sm:max-w-[450px] border-l',
          side === 'left' && 'h-full w-full sm:w-[450px] sm:max-w-[450px] border-r',
          side === 'top' && 'w-full h-[350px] border-b',
          side === 'bottom' && 'w-full h-[350px] border-t',
          className,
        )}
        side={side}
        {...props}
      >
        {children}
        {showCloseButton && (
          <SheetClose className="ring-offset-background focus:ring-ring data-[state=open]:bg-secondary absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none text-muted hover:text-text">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </SheetClose>
        )}
      </SheetContentPrimitive>
    </SheetPortalPrimitive>
  );
}

type SheetHeaderProps = SheetHeaderPrimitiveProps;

function SheetHeader({ className, ...props }: SheetHeaderProps) {
  return (
    <SheetHeaderPrimitive
      className={cn('flex flex-col gap-1.5 p-6 pb-0', className)}
      {...props}
    />
  );
}

type SheetFooterProps = SheetFooterPrimitiveProps;

function SheetFooter({ className, ...props }: SheetFooterProps) {
  return (
    <SheetFooterPrimitive
      className={cn('mt-auto flex flex-col-reverse sm:flex-row sm:justify-end gap-2 p-6 pt-0 border-t border-border', className)}
      {...props}
    />
  );
}

type SheetTitleProps = SheetTitlePrimitiveProps;

function SheetTitle({ className, ...props }: SheetTitleProps) {
  return (
    <SheetTitlePrimitive
      className={cn('text-lg font-semibold text-text', className)}
      {...props}
    />
  );
}

type SheetDescriptionProps = SheetDescriptionPrimitiveProps;

function SheetDescription({ className, ...props }: SheetDescriptionProps) {
  return (
    <SheetDescriptionPrimitive
      className={cn('text-sm text-muted', className)}
      {...props}
    />
  );
}

// Body component for sheet content area with scrolling
type SheetBodyProps = React.ComponentProps<'div'>;

function SheetBody({ className, ...props }: SheetBodyProps) {
  return (
    <div
      data-slot="sheet-body"
      className={cn('flex-1 overflow-y-auto px-6', className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  type SheetProps,
  type SheetTriggerProps,
  type SheetCloseProps,
  type SheetContentProps,
  type SheetHeaderProps,
  type SheetBodyProps,
  type SheetFooterProps,
  type SheetTitleProps,
  type SheetDescriptionProps,
};
