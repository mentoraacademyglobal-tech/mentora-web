// Never permit preview-mode authentication bypass in a production build.
export const demoMode = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_MENTORA_DEMO === '1';
export function safeText(value: unknown) { return value == null ? '—' : String(value); }
export function money(value: number | string | null | undefined) { return new Intl.NumberFormat('en-LK', {style:'currency',currency:'LKR',maximumFractionDigits:0}).format(Number(value||0)); }
export function escapeCsv(value: unknown) {
  const raw = value == null ? '' : String(value);
  const guarded = /^[\s]*[=+@\-]/.test(raw) ? "'" + raw : raw;
  return `"${guarded.replace(/"/g,'""')}"`;
}
export function csvExport(rows: Record<string,unknown>[], keys: string[]) {
  return [keys.map(escapeCsv).join(','),...rows.map(row=>keys.map(key=>escapeCsv(row[key])).join(','))].join('\r\n');
}
