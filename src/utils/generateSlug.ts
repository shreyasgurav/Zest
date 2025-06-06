export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, '')     // Trim hyphens from start/end
    .replace(/--+/g, '-');       // Replace multiple hyphens with one
} 