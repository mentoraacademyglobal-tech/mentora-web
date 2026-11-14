import StudentWorkspace from '@/components/StudentWorkspace';

// Explicit route: never falls through to the generic module detail viewer.
// The parent (manager) layout continues to enforce manager authentication.
export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <StudentWorkspace id={id} />;
}
