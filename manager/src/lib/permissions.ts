export type StaffRole =
  | 'super_admin'
  | 'admin'
  | 'academic_admin'
  | 'finance_admin'
  | 'content_manager'
  | 'inventory_manager'
  | 'teacher';

export const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'],
  admin: ['*'],
  academic_admin: [
    'courses.*',
    'boards.*',
    'qualifications.*',
    'subjects.*',
    'versions.*',
    'batches.*',
    'tutors.*',
    'lessons.*',
    'curriculum.*',
    'attendance.*',
    'assessments.*',
    'timetables.*',
    'exams.*',
    'exam-questions.*',
    'report-cards.*',
    'students.read',
    'groups.*',
  ],
  finance_admin: [
    'invoices.*',
    'tute-coupons.*',
    'recording-orders.*',
    'tute-orders.*',
    'merchandise-orders.*',
    'tickets.*',
    'points.*',
    'coins.*',
    'students.read',
  ],
  content_manager: [
    'recordings.*',
    'recording-classes.*',
    'videos.*',
    'resources.*',
    'gallery.*',
    'testimonials.*',
    'messages.*',
    'forum.*',
  ],
  inventory_manager: [
    'tute-categories.*',
    'tutes.*',
    'tute-orders.*',
    'products.*',
    'merchandise-orders.*',
  ],
  teacher: [
    'courses.read',
    'lessons.*',
    'recordings.*',
    'attendance.*',
    'assessments.*',
    'curriculum.*',
    'forum.*',
    'timetables.read',
    'students.read',
  ],
};

/**
 * Returns whether a user with given role can access a module slug or action.
 */
export function canAccess(role: string | null | undefined, slug: string, action: 'read' | 'write' = 'read'): boolean {
  if (!role) return false;
  if (action === 'write' && ['admins','roles'].includes(slug)) return role === 'super_admin';
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  if (perms.includes('*')) return true;

  // Check exact matches or wildcards
  if (perms.includes(`${slug}.*`)) return true;
  if (action === 'read' && perms.includes(`${slug}.read`)) return true;
  if (action === 'write' && perms.includes(`${slug}.write`)) return true;
  return false;
}

/**
 * Returns permissions array formatted for the Shell component navigation.
 */
export function getPermissionsForRole(role: string | null | undefined): string[] {
  if (!role) return [];
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return [];
  if (perms.includes('*')) return ['*'];

  const out: string[] = [];
  for (const p of perms) {
    if (p.endsWith('.*')) {
      const base = p.slice(0, -2);
      out.push(`${base}.read`, `${base}.write`);
    } else {
      out.push(p);
    }
  }
  return out;
}
