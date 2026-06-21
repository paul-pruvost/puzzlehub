import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-pill font-semibold tracking-tight ' +
  'transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 ' +
  'disabled:hover:translate-y-0 select-none';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-gradient-accent text-accent-fg shadow-1 hover:shadow-2 hover:-translate-y-0.5 ' +
    'active:translate-y-0 motion-reduce:transform-none',
  secondary:
    'border border-border bg-surface text-text hover:border-accent hover:bg-surface-2 ' +
    'hover:-translate-y-0.5 active:translate-y-0 motion-reduce:transform-none',
  ghost: 'text-muted hover:text-text hover:bg-surface-2',
  danger: 'bg-danger text-white shadow-1 hover:brightness-110',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-1.5 text-sm',
  md: 'px-5 py-2.5 text-sm',
};

/** Classes d'un bouton — réutilisables sur un `<a>`/`<Link>` (mode classé, nav). */
export function buttonClasses(
  variant: ButtonVariant = 'primary',
  size: ButtonSize = 'md',
  className?: string,
): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: ButtonProps): JSX.Element {
  return <button type={type} className={buttonClasses(variant, size, className)} {...rest} />;
}
