import { AlertCircle, AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Alert({ variant = 'info', title, children, className }: AlertProps) {
  const variants = {
    info: {
      container: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
      icon: <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />,
      title: 'text-blue-900 dark:text-blue-100',
      text: 'text-blue-800 dark:text-blue-200',
    },
    success: {
      container: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
      icon: <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />,
      title: 'text-green-900 dark:text-green-100',
      text: 'text-green-800 dark:text-green-200',
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
      icon: <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />,
      title: 'text-yellow-900 dark:text-yellow-100',
      text: 'text-yellow-800 dark:text-yellow-200',
    },
    error: {
      container: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
      icon: <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />,
      title: 'text-red-900 dark:text-red-100',
      text: 'text-red-800 dark:text-red-200',
    },
  };

  const styles = variants[variant];

  return (
    <div
      className={cn(
        'flex gap-3 p-4 rounded-lg border',
        styles.container,
        className
      )}
    >
      <div className="flex-shrink-0">{styles.icon}</div>
      <div className="flex-1">
        {title && (
          <h4 className={cn('font-semibold mb-1', styles.title)}>{title}</h4>
        )}
        <div className={cn('text-sm', styles.text)}>{children}</div>
      </div>
    </div>
  );
}

