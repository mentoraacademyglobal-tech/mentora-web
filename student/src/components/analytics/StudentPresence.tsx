'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
export default function StudentPresence(){
  const pathname=usePathname();
  useEffect(()=>{
    const send=()=>{
      if(document.visibilityState!=='visible')return;
      void fetch('/api/student/presence',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({path:pathname}),keepalive:true,cache:'no-store'}).catch(()=>{});
    };
    send();const timer=window.setInterval(send,60_000);
    document.addEventListener('visibilitychange',send);
    return ()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',send);};
  },[pathname]);
  return null;
}
