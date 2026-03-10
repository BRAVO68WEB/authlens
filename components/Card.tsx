import { cn } from '@/lib/utils';
import {
  Card as ShadCard,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@/components/ui/card';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  description?: string;
}

export function Card({ children, className, title, description }: CardProps) {
  return (
    <ShadCard className={cn('shadow-none', className)}>
      {(title || description) && (
        <CardHeader className="p-3 pb-0">
          {title && <CardTitle className="text-sm font-semibold">{title}</CardTitle>}
          {description && <CardDescription className="text-xs">{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="p-3">{children}</CardContent>
    </ShadCard>
  );
}
