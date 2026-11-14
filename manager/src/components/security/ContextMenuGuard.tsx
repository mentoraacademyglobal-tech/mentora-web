"use client";
import { useEffect } from "react";
/** Convenience-level context-menu suppression. NOT a security or DRM boundary. */
export default function ContextMenuGuard(){
  useEffect(()=>{
    const block=(event: MouseEvent)=>event.preventDefault();
    document.addEventListener('contextmenu',block);
    return ()=>document.removeEventListener('contextmenu',block);
  },[]);
  return null;
}
