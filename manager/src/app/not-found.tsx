import Link from 'next/link';
export default function NotFound(){return <section className="page-content"><h1>Page not found</h1><p>This address may have changed. Use navigation to find the page you need.</p><Link className="btn btn-primary" href="/dashboard">Back to dashboard</Link></section>;}
