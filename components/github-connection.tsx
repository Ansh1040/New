"use client";
import { useEffect, useState } from "react";
import { useTaskNotifications } from "@/components/task-notifications";

export function GitHubConnection({onConnected,busy,onPublish,publishing}:{onConnected:(value:boolean)=>void;busy:boolean;onPublish:()=>void;publishing:boolean}) {
  const notify=useTaskNotifications();
  const [connected,setConnected]=useState(false);
  const [configured,setConfigured]=useState(false);
  const [loading,setLoading]=useState(true);
  const [working,setWorking]=useState(false);
  const [token,setToken]=useState("");
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const button="rounded-lg border border-[var(--desk-border-strong)] px-3 py-2 text-sm font-semibold text-[color:var(--desk-link)] disabled:opacity-50";
  useEffect(()=>{
    let active=true;
    fetch("/api/github-connection",{cache:"no-store"}).then(async r=>{const data=await r.json();if(!r.ok)throw new Error(data.error);if(active){setConnected(data.connected);setConfigured(data.configured);onConnected(data.connected);}}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[onConnected]);
  async function connect(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setWorking(true);setError("");setMessage("");
    try{
      const response=await fetch("/api/github-connection",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      setToken("");setConnected(true);onConnected(true);setMessage("GitHub connected securely. Sync & refresh will now publish your updated progress.");
      notify("GitHub connected","One-click progress publishing is ready.");
    }catch(e){const detail=e instanceof Error?e.message:"GitHub connection failed.";setError(detail);notify("GitHub connection failed",detail,"error");}finally{setWorking(false);}
  }
  return <details className="mt-4 rounded-xl border border-[var(--desk-border-soft)] p-4" open={!loading&&!connected}>
    <summary className="cursor-pointer text-sm font-semibold">GitHub sharing — {loading?"checking connection…":connected?"connected":"connect for one-click publishing"}</summary>
    <p className="mt-3 text-sm text-[color:var(--desk-muted)]">Publish your subject percentages and test counts to <a className="font-semibold underline" href="https://ansh1040.github.io/New/" target="_blank" rel="noreferrer">your shared progress page</a>.</p>
    {!connected && <form className="mt-3 space-y-3" onSubmit={connect}>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-[color:var(--desk-muted)]"><li><a className="font-semibold underline" href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noreferrer">Create a fine-grained GitHub token</a>.</li><li>Select only <strong>Ansh1040/New</strong> and give <strong>Contents: Read and write</strong> permission. Choose an expiry date.</li><li>Enter it below and connect. Reconnect when the token expires.</li></ol>
      <label className="block text-sm">Fine-grained token<input type="password" autoComplete="off" spellCheck={false} value={token} onChange={e=>setToken(e.target.value)} placeholder="github_pat_…" maxLength={500} className="mt-1 block w-full rounded-lg border p-3 font-mono text-sm" required disabled={working||busy||!configured}/></label>
      <button type="submit" className={button} disabled={working||busy||!configured||!token.trim()}>{working?"Connecting…":"Connect GitHub securely"}</button>
      <p className="text-xs text-[color:var(--desk-subtle)]">Sent over HTTPS to your signed-in tracker and stored encrypted on the server. It is never included in the public page or source code.</p>
      {!loading&&!configured&&<p role="alert" className="text-sm text-red-600">Secure connection setup is not available yet.</p>}
    </form>}
    {connected && <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={onPublish} className={button} disabled={working||busy}>{publishing?"Publishing…":"Publish saved progress"}</button><button type="button" className={button} disabled={working||busy} onClick={async()=>{setWorking(true);setError("");try{const r=await fetch("/api/github-connection",{method:"DELETE"});if(!r.ok)throw new Error("Could not disconnect GitHub.");setConnected(false);onConnected(false);setMessage("GitHub disconnected. You can revoke the token in GitHub settings.");notify("GitHub disconnected","The saved connection was removed.");}catch(e){setError(e instanceof Error?e.message:"Could not disconnect.");}finally{setWorking(false);}}}>Disconnect GitHub</button></div>}
    {message&&<p role="status" className="mt-3 text-sm text-[color:var(--desk-link)]">{message}</p>}
    {error&&<p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
  </details>;
}
