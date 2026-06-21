import type { HTMLAttributes } from 'react';
import { cn } from '../cn';

export type BadgeTone = 'muted' | 'accent' | 'success' | 'danger';

const TONES: Record<BadgeTone, string> = {
  muted: 'border-border bg-surface-2 text-muted',
  accent: 'border-accent bg-surface text-accent',
  success: 'border-success bg-surface text-success',
  danger: 'border-danger bg-surface text-danger',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = 'muted', className, ...rest }: BadgeProps): JSX.Element {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-pill border px-2.5 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
      {...rest}
    />
  );
}
