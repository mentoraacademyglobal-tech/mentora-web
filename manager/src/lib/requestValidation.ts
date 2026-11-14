import {parseSubjectMarks} from './reportMarks';
import {z} from 'zod';
import {allowedWriteKeys, type Module} from './modules';

export function parsePagination(params: URLSearchParams): {page:number;limit:number} | null {
 const page = Number(params.get('page') ?? 1);
 const limit = Number(params.get('limit') ?? 10);
 return Number.isSafeInteger(page) && page >= 1 && page <= 100000 &&
   Number.isSafeInteger(limit) && limit >= 1 && limit <= 100 ? {page,limit} : null;
}

export function parseFields(m:Module,body:unknown,create = false):Record<string,unknown>{
 const object=z.record(z.string(),z.unknown()).parse(body);
 const allowed=allowedWriteKeys(m);const out:Record<string,unknown>={};
 if (create) for (const field of m.fields.filter(f=>f.required)) {
   if (!(field.key in object) || object[field.key] === null || String(object[field.key]).trim() === '') throw new Error(`${field.label} is required`);
 }
 for(const [key,val] of Object.entries(object)){
  if(!allowed.includes(key))throw new Error(`Field not editable: ${key}`);
  const field=m.fields.find(f=>f.key===key)!;
  if(field.required && (val == null || (typeof val === 'string' && !val.trim()))) throw new Error(`${field.label} is required`);
  if(m.slug==='tute-coupons' && key==='code'){
   if(typeof val!=='string' || !/^[A-Z0-9_-]{1,40}$/.test(val.trim().toUpperCase())) throw new Error('Use up to 40 letters, numbers, dashes or underscores.');
   out.code=val.trim().toUpperCase();
   continue;
  }
  if(m.slug==='tute-coupons' && key==='percent_off' && !Number.isInteger(val)) throw new Error('Enter a whole percentage.');
  if(m.slug==='report-cards' && key==='subject_marks'){
   try {out[key]=parseSubjectMarks(val ?? []);}catch {throw new Error('Subject marks must be a JSON array with a subject and valid numeric marks for each row');}
   continue;
  }
  if(val==null){out[key]=null;continue;}
  if(field.type==='number'){
   if(typeof val!=='number'||!Number.isFinite(val)||val < (field.min ?? 0) || (field.max !== undefined && val > field.max))throw new Error(`Invalid number: ${key}`);
   out[key]=val;
  }else{
   if(typeof val!=='string'||val.length>5000)throw new Error(`Invalid text: ${key}`);
   if(field.type==='select'&&field.options&&!field.options.includes(val))throw new Error(`Invalid selection: ${key}`);
   if(field.type==='url'&&val && !/^https:\/\//i.test(val))throw new Error(`URL must use HTTPS: ${key}`);
   if(field.type==='datetime-local'&&val&&!Number.isFinite(new Date(val).valueOf()))throw new Error(`Invalid timestamp: ${key}`);
   out[key]=field.type==='datetime-local'&&val?new Date(val).toISOString():val;
  }
 }
 return out;
}
