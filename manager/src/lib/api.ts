import {NextResponse} from 'next/server';
import {demoMode} from '@/lib/demo';
import {requireManager} from '@/lib/supabase';
import {moduleBySlug} from '@/lib/modules';
import {canAccess} from '@/lib/permissions';

export function denyDemo(){return NextResponse.json({error:'Preview data lives in the browser. Demo API is disabled.'},{status:409});}
export async function managerContext(slug:string, action: 'read' | 'write' = 'read'){
 if(demoMode) return {error:denyDemo(),module:undefined,auth:undefined};
 const m=moduleBySlug[slug];if(!m)return {error:NextResponse.json({error:'Unknown module'},{status:404}),module:undefined,auth:undefined};
 const auth=await requireManager();if(!auth.authorized)return {error:NextResponse.json({error:'Unauthorized'},{status:403}),module:m,auth:undefined};
 if(!canAccess(auth.role, slug, action)) {
   return {error:NextResponse.json({error:`Permission denied for role: ${auth.role || 'none'}`},{status:403}),module:m,auth:undefined};
 }
 return {error:undefined,module:m,auth};
}
export {parseFields} from './requestValidation';
