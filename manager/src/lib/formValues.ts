import type {Field} from './modules';
export function editValue(field: Field, value: unknown): unknown {
 if (value == null) return '';
 if (field.type === 'datetime-local') {
  const date = new Date(String(value));
  if (!Number.isFinite(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0,16);
 }
 if (typeof value === 'object') return JSON.stringify(value, null, 2);
 return value;
}
export function uploadCategory(slug: string): string | null {
 const categories: Record<string,string> = {resources:'resource',gallery:'gallery',products:'product',tutes:'tute',courses:'course',testimonials:'testimonial'};
 return categories[slug] ?? null;
}
