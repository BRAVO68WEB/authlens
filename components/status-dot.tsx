import { cn } from '@/lib/utils';
import { STATUS_COLORS, type StatusType } from '@/lib/theme';

interface StatusDotProps {
  status: StatusType;
  pulse?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusDot({ status, pulse, size = 'sm', className }: StatusDotProps) {
  const colors = STATUS_COLORS[status];
  const sizeClasses = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5';

  return (
    <span className={cn('relative inline-flex', className)}>
      <span className={cn('rounded-full', sizeClasses, colors.dot)} />
      {(pulse || status === 'active') && (
        <span
          className={cn(
            'absolute inset-0 rounded-full animate-ping opacity-75',
            sizeClasses,
            colors.dot
          )}
        />
      )}
    </span>
  );
}
