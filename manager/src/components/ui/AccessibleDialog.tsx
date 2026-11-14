"use client";
import {useEffect,useRef} from 'react';
export default function AccessibleDialog({children,label,onClose,className=''}:{children:React.ReactNode;label:string;onClose:()=>void;className?:string}) {
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{
  const dialog=ref.current;const previous=document.activeElement as HTMLElement|null;
  const overflow=document.body.style.overflow;
  dialog?.showModal();document.body.style.overflow='hidden';
  return()=>{dialog?.close();document.body.style.overflow=overflow;if(previous?.isConnected)previous.focus();};
 },[]);
 return <dialog ref={ref} aria-label={label} className={`accessible-dialog ${className}`} onCancel={e=>{e.preventDefault();onClose();}} onClick={e=>{if(e.target===e.currentTarget)onClose();}}>{children}</dialog>;
}
