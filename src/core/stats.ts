export type NeumeTally = { attempts: number; errors: number };
export type Tallies = Readonly<Record<string, NeumeTally>>;

/** Neumes with at least one error, worst first: errors desc, then attempts desc, then id. Up to `n`. */
export function hardest(tallies: Tallies, n: number): { id: string; attempts: number; errors: number }[] {
  return Object.entries(tallies)
    .filter(([, t]) => t.errors > 0)
    .map(([id, t]) => ({ id, attempts: t.attempts, errors: t.errors }))
    .sort((a, b) => b.errors - a.errors || b.attempts - a.attempts || a.id.localeCompare(b.id))
    .slice(0, n);
}
