export function defaultSimpleProductSku(slug: string): string {
  return slug.toUpperCase().replace(/[^A-Z0-9-]/gi, '');
}
