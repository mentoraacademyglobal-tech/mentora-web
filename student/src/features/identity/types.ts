export type MembershipRow = {
  role: string;
  organisations: { name: string; timezone: string } | { name: string; timezone: string }[] | null;
};
