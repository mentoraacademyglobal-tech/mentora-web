import type {SupabaseClient} from '@supabase/supabase-js';
import {z} from 'zod';
import {moduleBySlug,type Module} from './modules';
/** Validate linked records as well as the tenant of the row being written. */
export async function validateReferences(db:SupabaseClient,org:string,module:Module,fields:Record<string,unknown>):Promise<string|null>{
 for(const field of module.fields){
  if(!field.relation || fields[field.key]==null || fields[field.key]==='')continue;
  const value=fields[field.key];
  if(!z.string().uuid().safeParse(value).success)return `Choose a valid ${field.label}`;
  const related=moduleBySlug[field.relation];
  if(!related)return `Unsupported reference: ${field.label}`;
  const directory=['students','tutors','admins'].includes(field.relation);
  let query=db.from(related.table).select('id').eq('organisation_id',org).eq(directory?'user_id':'id',String(value));
  if(field.relation==='students')query=query.eq('role','student');
  if(field.relation==='tutors')query=query.eq('role','teacher');
  const {data,error}=await query.limit(1).maybeSingle();
  if(error || !data)return `${field.label} is unavailable in this academy`;
 }
 return null;
}
