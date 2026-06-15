export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 40);
}

export function randomSlug(): string {
  return Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6);
}

// Password "related to the company" + short suffix so it's not guessable across cards.
export function cardPassword(company: string): string {
  const base = (company || 'thanks').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16) || 'thanks';
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}
