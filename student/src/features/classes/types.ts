export type Person = { full_name: string; email: string | null };
export type PersonRel = Person | Person[] | null;

export type SubjectRef = { name: string; syllabus_code: string };
export type SubjectRel = SubjectRef | SubjectRef[] | null;

export type ClassSummary = {
  id: string;
  name: string;
  term: string | null;
  rate_per_lesson?: number | null;
  discount_amount?: number | null;
  subjects: SubjectRel;
};

export type ClassDetail = ClassSummary & {
  organisations: { timezone: string } | { timezone: string }[] | null;
};

export type SessionRow = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  status: string;
  join_opens_minutes: number;
};

export type UpcomingSession = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  join_opens_minutes: number;
  class_id: string;
  classes: { name: string } | { name: string }[] | null;
};

export type ClassAccess = {
  isAdmin: boolean;
  isTeacher: boolean;
  isStudent: boolean;
  /** Admins and the class's teachers. */
  isManager: boolean;
};

export type Board = { name: string };
export type Qualification = { name: string; boards: Board | Board[] | null };
export type SubjectOption = {
  id: string;
  name: string;
  syllabus_code: string;
  qualifications: Qualification | Qualification[] | null;
};

export type TeacherRow = { teacher_id: string; profiles: PersonRel };
export type StudentRow = { id: string; status: string; profiles: PersonRel };
export type OrgTeacher = { user_id: string; profiles: PersonRel };
export type InviteRow = { id: string; code: string; role: string; uses_left: number; expires_at: string | null };
