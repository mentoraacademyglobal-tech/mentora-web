import {NextResponse} from 'next/server';
import {requireManager} from '@/lib/supabase';
import {isSupportedUpload} from '@/lib/upload';
import {canAccess} from '@/lib/permissions';
import {demoMode} from '@/lib/demo';
export const dynamic='force-dynamic';
const allowed:Record<string,string>={resource:'resources.write',gallery:'gallery.write',product:'products.write',tute:'tutes.write',course:'courses.write',testimonial:'testimonials.write'};
const types=new Set(['application/pdf','image/jpeg','image/png','image/webp','application/zip']);
export async function POST(request:Request){
 if(demoMode)return NextResponse.json({error:'Demo mode does not store uploaded files'},{status:409});
 const {supabase,authorized,organisationId,role}=await requireManager();if(!authorized)return NextResponse.json({error:'Unauthorized'},{status:403});
 const form=await request.formData();const file=form.get('file');const category=String(form.get('category')||'');
 if(!(file instanceof File)||!(category in allowed))return NextResponse.json({error:'A supported category and file are required'},{status:400});
 if(!canAccess(role,allowed[category].split('.')[0],'write'))return NextResponse.json({error:'Forbidden'},{status:403});
 if(file.size<1||file.size>10485760||!types.has(file.type))return NextResponse.json({error:'Invalid file type or file exceeds 10 MB'},{status:400});
 if((['gallery','product','course','testimonial'].includes(category))&&!file.type.startsWith('image/'))return NextResponse.json({error:'An image file is required'},{status:400});
 const ext=file.type==='application/pdf'?'pdf':file.type==='image/png'?'png':file.type==='image/jpeg'?'jpg':file.type==='image/webp'?'webp':'zip';
 const path=`${organisationId}/${category}/${crypto.randomUUID()}.${ext}`;
 const bytes=new Uint8Array(await file.arrayBuffer());
 if(!isSupportedUpload(bytes,file.type))return NextResponse.json({error:'File contents do not match the selected type'},{status:400});
 const{data,error}=await supabase.storage.from('mentora-manager-media').upload(path,bytes,{contentType:file.type,upsert:false});
 if(error)return NextResponse.json({error:error.message},{status:400});
 return NextResponse.json({path:data?.path||path});
}
