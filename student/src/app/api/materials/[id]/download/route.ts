import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Generate an expiring download URL at click time, not when the page was rendered. */
export async function GET(_request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const {id}=await params;
  const supabase=await createClient();
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user)return NextResponse.json({error:"Sign in required"},{status:401});
  const {data:resource,error}=await supabase.from("mm_resources")
    .select("file_path,status").eq("id",id).eq("status","published").maybeSingle();
  if(error)return NextResponse.json({error:"Unable to access this resource"},{status:403});
  if(!resource?.file_path)return NextResponse.json({error:"Resource unavailable"},{status:404});
  // The database RLS and private bucket policies must BOTH allow this signed URL.
  const {data:signed,error:signError}=await supabase.storage.from("mentora-manager-media")
    .createSignedUrl(resource.file_path,60);
  if(signError||!signed?.signedUrl)return NextResponse.json({error:"File access denied"},{status:403});
  return NextResponse.redirect(new URL(signed.signedUrl),{status:302});
}
