'use client';

import * as React from 'react';
import * as AccordionPrimitive from '@radix-ui/react-accordion';
import { motion, type Transition } from 'motion/react';
import { cn } from '@/lib/utils';
import { getStrictContext } from '@/lib/getStrictContext';
import { useControlledState } from '@/hooks/useControlledState';

// Accordion Context
type AccordionContextValue = {
  transition: Transition;
  maskClassName?: string;
  maskStyle?: React.CSSProperties;
};

const [AccordionProvider, useAccordionContext] =
  getStrictContext<AccordionContextValue>('Accordion');

// Root Component
export type AccordionRootProps = {
  children?: React.ReactNode;
  className?: string;
  type?: 'single' | 'multiple';
  value?: string | string[];
  defaultValue?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  transition?: Transition;
  maskClassName?: string;
  maskStyle?: React.CSSProperties;
  disabled?: boolean;
};

function Accordion({
  children,
  className,
  type = 'single',
  value,
  defaultValue,
  onValueChange,
  transition = { type: 'spring', stiffness: 350, damping: 35 },
  maskClassName,
  maskStyle,
  disabled,
}: AccordionRootProps) {
  // Handle single vs multiple type value states
  const isSingle = type === 'single';
  
  const [singleValue, setSingleValue] = useControlledState<string>({
    value: isSingle ? (value as string | undefined) : undefined,
    defaultValue: isSingle ? (defaultValue as string | undefined) ?? '' : '',
    onChange: isSingle ? (v) => onValueChange?.(v) : undefined,
  });

  const [multipleValue, setMultipleValue] = useControlledState<string[]>({
    value: !isSingle ? (value as string[] | undefined) : undefined,
    defaultValue: !isSingle ? (defaultValue as string[] | undefined) ?? [] : [],
    onChange: !isSingle ? (v) => onValueChange?.(v) : undefined,
  });

  return (
    <AccordionProvider value={{ transition, maskClassName, maskStyle }}>
      {isSingle ? (
        <AccordionPrimitive.Root
          type="single"
          value={singleValue}
          onValueChange={setSingleValue}
          collapsible
          disabled={disabled}
          className={className}
        >
          {children}
        </AccordionPrimitive.Root>
      ) : (
        <AccordionPrimitive.Root
          type="multiple"
          value={multipleValue}
          onValueChange={setMultipleValue}
          disabled={disabled}
          className={className}
        >
          {children}
        </AccordionPrimitive.Root>
      )}
    </AccordionProvider>
  );
}

// Item Component
export type AccordionItemProps = {
  children?: React.ReactNode;
  className?: string;
  value: string;
  disabled?: boolean;
};

function AccordionItem({ children, className, value, disabled }: AccordionItemProps) {
  return (
    <AccordionPrimitive.Item value={value} disabled={disabled} className={className}>
      {children}
    </AccordionPrimitive.Item>
  );
}

// Header Component
export type AccordionHeaderProps = {
  children?: React.ReactNode;
  className?: string;
};

function AccordionHeader({ children, className }: AccordionHeaderProps) {
  return (
    <AccordionPrimitive.Header className={className}>
      {children}
    </AccordionPrimitive.Header>
  );
}

// Trigger Component
export type AccordionTriggerProps = {
  children?: React.ReactNode;
  className?: string;
};

function AccordionTrigger({ children, className }: AccordionTriggerProps) {
  return (
    <AccordionPrimitive.Trigger className={className}>
      {children}
    </AccordionPrimitive.Trigger>
  );
}

// Content Component with Animation
export type AccordionContentProps = {
  children?: React.ReactNode;
  className?: string;
  transition?: Transition;
  maskClassName?: string;
  maskStyle?: React.CSSProperties;
};

function AccordionContent({
  children,
  className,
  transition: transitionProp,
  maskClassName: maskClassNameProp,
  maskStyle: maskStyleProp,
}: AccordionContentProps) {
  const context = useAccordionContext();
  const transition = transitionProp ?? context.transition;
  const maskClassName = maskClassNameProp ?? context.maskClassName;
  const maskStyle = maskStyleProp ?? context.maskStyle;

  return (
    <AccordionPrimitive.Content
      className={cn('overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down', className)}
    >
      <div className="relative">
        {children}
        <motion.div
          className={cn(
            'pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-current to-transparent',
            maskClassName,
          )}
          style={{
            height: '30%',
            maxHeight: '50px',
            ...maskStyle,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0 }}
          transition={transition}
        />
      </div>
    </AccordionPrimitive.Content>
  );
}

export {
  Accordion,
  AccordionItem,
  AccordionHeader,
  AccordionTrigger,
  AccordionContent,
  useAccordionContext,
};
