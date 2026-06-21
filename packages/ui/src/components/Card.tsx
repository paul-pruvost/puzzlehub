import type { HTMLAttributes } from 'react';
import { cn } from '../cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Ajoute le feedback de survol (lift + ombre) pour les cartes cliquables. */
  interactive?: boolean;
}

export function Card({ interactive = false, className, ...rest }: CardProps): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-card border border-border bg-surface shadow-1',
        interactive &&
          'transition-all duration-200 hover:-translate-y-1 hover:border-accent hover:shadow-2 ' +
            'motion-reduce:transform-none',
        className,
      )}
      {...rest}
    />
  );
}
