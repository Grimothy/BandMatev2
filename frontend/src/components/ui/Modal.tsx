import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "./sheet"

// =============================================================================
// BASE DIALOG COMPONENTS (for ConfirmationModal - centered dialogs)
// =============================================================================

const Dialog = DialogPrimitive.Root

const DialogTrigger = DialogPrimitive.Trigger

const DialogPortal = DialogPrimitive.Portal

const DialogClose = DialogPrimitive.Close

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg",
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

// =============================================================================
// SIDESHEET - Animated side-drawer for forms, settings, creation panels
// Uses the new Sheet component with motion animations
// =============================================================================

interface SideSheetProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  description?: string
  size?: 'sm' | 'md' | 'lg'
  /** Content to render in the footer (typically action buttons) */
  footer?: React.ReactNode
}

const sizeClasses = {
  sm: 'sm:w-[350px] sm:max-w-[350px]',
  md: 'sm:w-[450px] sm:max-w-[450px]',
  lg: 'sm:w-[550px] sm:max-w-[550px]',
}

function SideSheet({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  description,
  size = 'md',
  footer,
}: SideSheetProps) {
  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent 
        side="right" 
        className={cn("bg-card border-border w-full", sizeClasses[size])}
      >
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <SheetBody>
          {children}
        </SheetBody>
        {footer && (
          <SheetFooter>
            {footer}
          </SheetFooter>
        )}
      </SheetContent>
    </Sheet>
  )
}

// =============================================================================
// CONFIRMATIONMODAL - Centered dialog for delete confirmations
// Intentionally interruptive to prevent accidental destructive actions
// =============================================================================

interface ConfirmationModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  description?: string
}

function ConfirmationModal({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  description,
}: ConfirmationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  )
}

// =============================================================================
// LEGACY MODAL - Deprecated, use SideSheet or ConfirmationModal instead
// Kept for backward compatibility during migration
// =============================================================================

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  description?: string
}

/**
 * @deprecated Use SideSheet for forms/settings or ConfirmationModal for confirmations
 */
function Modal({ isOpen, onClose, title, children, size = 'md', description }: ModalProps) {
  // Map to SideSheet for backward compatibility
  return (
    <SideSheet
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size={size}
    >
      {children}
    </SideSheet>
  )
}

export {
  // New components (preferred)
  SideSheet,
  ConfirmationModal,
  
  // Legacy (deprecated, maps to SideSheet)
  Modal,
  
  // Base Dialog primitives (for advanced usage)
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
