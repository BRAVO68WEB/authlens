import { cn } from '@/lib/utils';
import { PROTOCOL_COLORS } from '@/lib/theme';
import type { ProtocolType } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

interface ProtocolBadgeProps {
  protocol: ProtocolType;
  className?: string;
}

export function ProtocolBadge({ protocol, className }: ProtocolBadgeProps) {
  const colors = PROTOCOL_COLORS[protocol];
  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] font-mono px-1.5 py-0',
        colors.text,
        colors.border,
        colors.bg,
        className
      )}
    >
      {protocol.toUpperCase()}
    </Badge>
  );
}
