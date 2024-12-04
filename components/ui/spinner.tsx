import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <Loader2
      className={cn('h-4 w-4 animate-spin text-muted-foreground', className)}
      {...props}
    />
  );
}
