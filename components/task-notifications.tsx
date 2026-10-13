"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
type Notification = {id:string;title:string;description?:string;kind:"success"|"error"};
type Notify = (title:string,description?:string,kind?:"success"|"error")=>void;
const NotificationContext=createContext<Notify>(()=>{});
export function useTaskNotifications(){return useContext(NotificationContext);}
export function TaskNotifications({children}:{children:ReactNode}){
  const [items,setItems]=useState<Notification[]>([]);
  const notify=useCallback<Notify>((title,description,kind="success")=>{
    setItems(old=>[...old,{id:crypto.randomUUID(),title,description,kind}].slice(-4));
  },[]);
  const dismiss=useCallback((id:string)=>setItems(old=>old.filter(item=>item.id!==id)),[]);
  return <NotificationContext.Provider value={notify}>{children}<div aria-label="Task notifications" className="pointer-events-none fixed right-4 top-5 z-[100] flex w-[calc(100%_-_2rem)] max-w-sm flex-col gap-3 sm:right-6">
    {items.map(item=><TaskToast key={item.id} item={item} dismiss={dismiss}/>)}
  </div></NotificationContext.Provider>;
}
function TaskToast({item,dismiss}:{item:Notification;dismiss:(id:string)=>void}){
  useEffect(()=>{const timer=window.setTimeout(()=>dismiss(item.id),7000);return()=>window.clearTimeout(timer);},[item.id,dismiss]);
  return <div role={item.kind==="error"?"alert":"status"} className="pointer-events-auto flex items-start gap-3 rounded-xl border-2 border-[#ddbd73] bg-[#fff6df] p-4 text-[#193f30] shadow-[0_10px_35px_rgba(0,0,0,0.3)]">
    <span aria-hidden="true" className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-lg font-bold ${item.kind==="error"?"bg-[#fee2e2] text-[#991b1b]":"bg-[#cdebd6] text-[#165536]"}`}>{item.kind==="error"?"!":"✓"}</span>
    <div className="min-w-0 flex-1"><p className="font-bold">{item.title}</p>{item.description&&<p className="mt-1 text-sm leading-5 text-[#46604e]">{item.description}</p>}</div>
    <button type="button" aria-label={`Dismiss ${item.title} notification`} onClick={()=>dismiss(item.id)} className="rounded px-1 text-xl leading-6 text-[#46604e] hover:bg-[#eedeb8]">×</button>
  </div>;
}
