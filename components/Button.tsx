'use client';

import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import { Button as ShadButton } from '@/components/ui/button';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

const variantMap = {
  primary: 'default',
  secondary: 'secondary',
  danger: 'destructive',
  ghost: 'ghost',
} as const;

const sizeMap = {
  sm: 'sm',
  md: 'default',
  lg: 'lg',
} as const;

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <ShadButton
      variant={variantMap[variant]}
      size={sizeMap[size]}
      className={cn('gap-2', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </ShadButton>
  );
}
