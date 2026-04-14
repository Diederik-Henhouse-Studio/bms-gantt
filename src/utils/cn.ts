/** Minimal className merge utility (replaces Shadcn's cn) */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
