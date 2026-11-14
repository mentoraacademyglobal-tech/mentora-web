// When a person can press Join, and when they should be told to wait. Pure, so it can be tested.

export const GRACE_MS = 30 * 60 * 1000;

type Input = {
  startsAt: string;
  endsAt: string;
  opensMinutes: number;
  now: number;
  isStudent: boolean;
  isManager: boolean;
};

export function joinState({ startsAt, endsAt, opensMinutes, now, isStudent, isManager }: Input) {
  const start = Date.parse(startsAt);
  const end = Date.parse(endsAt);
  const opensAt = start - opensMinutes * 60 * 1000;

  const windowOpen = now >= opensAt && now <= end + GRACE_MS;
  // Teachers and admins can join any time until shortly after the class.
  const canJoin = (isStudent && windowOpen) || (isManager && now <= end + GRACE_MS);
  const waitingUntil = isStudent && !canJoin && now < opensAt ? opensAt : null;

  return { canJoin, waitingUntil };
}
