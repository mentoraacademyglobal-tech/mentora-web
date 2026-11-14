import {signOut} from '@/features/identity';

export default function AccountAccessPage() {
  return <main className="mx-auto max-w-lg space-y-5 p-8">
    <h1 className="text-2xl font-bold">Account access unavailable</h1>
    <p>Your academy access may be suspended or temporarily unavailable. Contact Mentora support before continuing.</p>
    <form action={signOut}><button className="student-action student-action-primary" type="submit">Sign out</button></form>
  </main>;
}
