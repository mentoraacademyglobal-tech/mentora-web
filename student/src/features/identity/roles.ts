export const ROLE_LABEL: Record<string, string> = {
  student: "Student",
  parent: "Parent",
  teacher: "Teacher",
  admin: "Admin",
  super_admin: "Super admin",
};

export const isAdminRole = (role: string) => role === "admin" || role === "super_admin";

export type Portal = "admin" | "teacher" | "student" | "parent" | "none";

/**
 * Which portal someone sees. A person with several roles gets the most powerful one,
 * so an admin who also teaches still lands in the admin portal.
 */
export function portalOf(roles: string[]): Portal {
  if (roles.some(isAdminRole)) return "admin";
  if (roles.includes("teacher")) return "teacher";
  if (roles.includes("student")) return "student";
  if (roles.includes("parent")) return "parent";
  return "none";
}
