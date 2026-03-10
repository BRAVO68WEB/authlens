import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert as ShadAlert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const icons = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  error: AlertCircle,
};

const styles = {
  info: 'border-blue-500/30 bg-blue-500/5 text-blue-700 dark:text-blue-300 [&>svg]:text-blue-500',
  success: 'border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-300 [&>svg]:text-green-500',
  warning: 'border-yellow-500/30 bg-yellow-500/5 text-yellow-700 dark:text-yellow-300 [&>svg]:text-yellow-500',
  error: 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300 [&>svg]:text-red-500',
};

export function Alert({ variant = 'info', title, children, className }: AlertProps) {
  const Icon = icons[variant];

  return (
    <ShadAlert className={cn(styles[variant], 'py-2.5', className)}>
      <Icon className="h-4 w-4" />
      {title && <AlertTitle className="text-xs font-semibold">{title}</AlertTitle>}
      <AlertDescription className="text-xs">{children}</AlertDescription>
    </ShadAlert>
  );
}
