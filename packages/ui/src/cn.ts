/** Concatène des classes conditionnelles en ignorant les valeurs falsy. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
