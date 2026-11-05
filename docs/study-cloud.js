(() => {
 const base='https://jiirfdxrgigmkkfvgwvc.supabase.co',key='sb_publishable_KhkiB9fmMxnVJvMkdUlN0Q_BrFESD0c';
 const panel=document.createElement('details');panel.className='card';panel.style.marginTop='24px';
 panel.innerHTML='<summary>Owner tools · Private cloud backup</summary><p>Public progress stays public. Backups require the owner’s verified account and are private.</p><button data-action="send">Email sign-in code</button><label> Verification code <input autocomplete="one-time-code" inputmode="numeric"></label><button data-action="verify">Verify</button><button data-action="backup">Back up published snapshot</button><button data-action="out">Sign out</button><p role="status">Not signed in</p>';
 const emailLabel=document.createElement('label');emailLabel.textContent='Owner email ';const emailInput=document.createElement('input');emailInput.type='email';emailInput.autocomplete='email';emailLabel.append(emailInput);panel.querySelector('button').before(emailLabel);document.querySelector('main').append(panel);
 const status=panel.querySelector('[role=status]');
 async function call(path,body,token){const r=await fetch(base+path,{method:'POST',headers:{apikey:key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.msg||d.message||d.error_description||'Cloud request failed');return d;}
 panel.addEventListener('click',async e=>{
  const b=e.target.closest('button');if(!b)return;const email=emailInput.value.trim().toLowerCase();if(!email&&b.dataset.action!=='out'){status.textContent='Enter your owner email';return;}
  const buttons=[...panel.querySelectorAll('button')];buttons.forEach(x=>x.disabled=true);
  try{
   if(b.dataset.action==='send'){await call('/auth/v1/otp',{email,create_user:true});status.textContent='Email sent from GATE Companion. Enter its code if shown; the new project email template may need configuration.';}
   if(b.dataset.action==='verify'){const code=panel.querySelector('input[autocomplete="one-time-code"]');const s=await call('/auth/v1/verify',{email,token:code.value.trim(),type:'email'});if(s.user?.email?.toLowerCase()!==email||!s.user?.email_confirmed_at)throw Error('Verified account required');sessionStorage.setItem('study-cloud',JSON.stringify(s));code.value='';status.textContent='Signed in for this tab';}
   if(b.dataset.action==='backup'){let s=JSON.parse(sessionStorage.getItem('study-cloud')||'null');if(!s)throw Error('Sign in first');if(Date.now()>=s.expires_at*1000-60000){s=await call('/auth/v1/token?grant_type=refresh_token',{refresh_token:s.refresh_token});sessionStorage.setItem('study-cloud',JSON.stringify(s));}const response=await fetch('./progress.json',{cache:'no-store'});if(!response.ok)throw Error('Cannot read published snapshot');const payload=await response.json();await call('/rest/v1/study_backups',{user_id:s.user.id,source:'progress-journal',payload},s.access_token);status.textContent='Private backup saved · '+new Date().toLocaleString();}
   if(b.dataset.action==='out'){sessionStorage.removeItem('study-cloud');status.textContent='Signed out on this tab';}
  }catch(err){status.textContent=err.message;}finally{buttons.forEach(x=>x.disabled=false);}
 });
})();
