const API_URL = String(import.meta.env.VITE_PAJSK_API_URL || 'https://sxmchnwzcbsanecxnqdt.supabase.co/functions/v1/pajsk-api').trim();

export async function apiCall<T=any>(action:string,payload:Record<string,unknown>={},password?:string):Promise<T>{
  const appPassword=password ?? sessionStorage.getItem('pajsk_app_password') ?? '';
  const res=await fetch(API_URL,{method:'POST',headers:{'Content-Type':'application/json','x-app-password':appPassword},body:JSON.stringify({action,...payload})});
  const data=await res.json().catch(()=>({}));
  if(!res.ok || data?.success===false){
    const err=new Error(data?.error || `Ralat pelayan (${res.status})`) as Error & {status?:number};
    err.status=res.status; throw err;
  }
  return data as T;
}
export const PAJSK_API_URL=API_URL;
