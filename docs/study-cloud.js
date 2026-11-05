(() => {
 const panel=document.createElement('details');panel.className='card';panel.style.cssText='margin-top:24px;padding:24px';
 const summary=document.createElement('summary');summary.textContent='Owner tools · Private journal backup';summary.style.cssText='font-size:18px;font-weight:600;min-height:44px';
 const text=document.createElement('p');text.textContent='Manage private backups in your signed-in tracker. This public page never asks for your email, code or session.';
 const link=document.createElement('a');link.href='https://cs-gate-study-tracker.ansh030410y.chatgpt.site/#journal-backup';link.textContent='Open secure backup controls ↗';link.style.cssText='display:inline-block;padding:14px 20px;border-radius:12px;background:var(--ink);color:var(--bg);font-weight:600;text-decoration:none;min-height:48px';
 const note=document.createElement('p');note.style.cssText='font-size:13px;color:var(--muted)';note.textContent='Journal snapshots are stored separately by source in GATE Companion. A dedicated project is pending because the account has reached its free-project limit.';
 panel.append(summary,text,link,note);document.querySelector('main').append(panel);
})();
