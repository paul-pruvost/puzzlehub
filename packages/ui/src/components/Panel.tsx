import type { HTMLAttributes } from 'react';
import { cn } from '../cn';

export type PanelTone = 'default' | 'success' | 'danger' | 'accent';

const TONES: Record<PanelTone, string> = {
  default: 'border-border bg-surface-2',
  success: 'border-success bg-surface-2',
  danger: 'border-danger bg-surface-2',
  accent: 'border-accent bg-surface-2',
};

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  tone?: PanelTone;
}

export function Panel({ tone = 'default', className, ...rest }: PanelProps): JSX.Element {
  return <div className={cn('rounded-card border', TONES[tone], className)} {...rest} />;
}
