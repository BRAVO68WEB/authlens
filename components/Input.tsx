'use client';

import { useId } from 'react';
import { cn } from '@/lib/utils';
import { Input as ShadInput } from '@/components/ui/input';
import { Textarea as ShadTextarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';


interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function Input({
  label,
  error,
  helperText,
  className,
  id,
  ...props
}: InputProps) {
  const reactId = useId();
  const inputId = id || reactId;

  return (
    <div className="w-full space-y-1">
      {label && (
        <Label htmlFor={inputId} className="text-xs">
          {label}
        </Label>
      )}
      <ShadInput
        id={inputId}
        suppressHydrationWarning={true}
        className={cn(
          'h-8 text-xs',
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        {...props}
      />
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {helperText && !error && (
        <p className="text-[11px] text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export function TextArea({
  label,
  error,
  helperText,
  className,
  id,
  ...props
}: TextAreaProps) {
  const reactId = useId();
  const inputId = id || reactId;

  return (
    <div className="w-full space-y-1">
      {label && (
        <Label htmlFor={inputId} className="text-xs">
          {label}
        </Label>
      )}
      <ShadTextarea
        id={inputId}
        suppressHydrationWarning={true}
        className={cn(
          'text-xs font-mono',
          error && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        {...props}
      />
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {helperText && !error && (
        <p className="text-[11px] text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options: Array<{ value: string; label: string }>;
}

export function Select({
  label,
  error,
  helperText,
  options,
  className,
  id,
  ...props
}: SelectProps) {
  const reactId = useId();
  const inputId = id || reactId;

  return (
    <div className="w-full space-y-1">
      {label && (
        <Label htmlFor={inputId} className="text-xs">
          {label}
        </Label>
      )}
      <select
        id={inputId}
        suppressHydrationWarning={true}
        className={cn(
          'flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-destructive focus:ring-destructive',
          className
        )}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {helperText && !error && (
        <p className="text-[11px] text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
