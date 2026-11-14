import ContextMenuGuard from "@/components/security/ContextMenuGuard";
import './globals.css';
import './class-workspace.css';
import './student-workspace.css';
import type { Metadata } from 'next';
export const metadata: Metadata = {title:'Mentora Manager',description:'Mentora learning platform administration'};
export default function RootLayout({children}:{children:React.ReactNode}) { return <html lang="en"><body><ContextMenuGuard />{children}</body></html>; }
