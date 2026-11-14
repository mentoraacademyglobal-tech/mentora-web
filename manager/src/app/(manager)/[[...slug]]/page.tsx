import '../../class-workspace.css';
import '../../student-workspace.css';
import Dashboard from '@/components/Dashboard';
import ClassWorkspace from '@/components/ClassWorkspace';
import StudentWorkspace from '@/components/StudentWorkspace';
import SettingsWorkspace from '@/components/SettingsWorkspace';
import ModuleView from '@/components/ModuleView';
import {moduleBySlug} from '@/lib/modules';
import {notFound} from 'next/navigation';

export default async function ManagerPage({params}:{params:Promise<{slug?:string[]}>}) {
 const {slug}=await params;
 if(!slug?.length || slug[0]==='dashboard')return <Dashboard/>;
 if(slug[0]==='settings')return <SettingsWorkspace/>;
 if(slug[0]==='classroom' && slug.length===2)return <ClassWorkspace id={slug[1]}/>;
 if(slug[0]==='student' && slug.length===2)return <StudentWorkspace id={slug[1]}/>;
 if(slug[0]==='students' && slug.length===2)return <StudentWorkspace id={slug[1]}/>;
 const mod=slug?.length===1?moduleBySlug[slug[0]]:undefined;
 if(!mod)notFound();
 return <ModuleView mod={mod}/>;
}
