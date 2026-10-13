import { env } from "cloudflare:workers";
import { sealToken, openToken } from "./sealed-token";
import { sharedProgress } from "./shared-progress";
import type { StudyState } from "./study-state";

const fileURL = "https://api.github.com/repos/Ansh1040/New/contents/docs/progress.json";
const pageURL = "https://ansh1040.github.io/New/";
function encryptionKey() {
  const secret = (env as unknown as {GITHUB_TOKEN_ENCRYPTION_KEY?:string}).GITHUB_TOKEN_ENCRYPTION_KEY;
  if (!secret) throw new Error("Secure GitHub connection setup is unavailable.");
  return secret;
}
async function github(token: string, method = "GET", body?: unknown) {
  const response = await fetch(fileURL, {method,headers:{Accept:"application/vnd.github+json",Authorization:`Bearer ${token}`,"X-GitHub-Api-Version":"2022-11-28","User-Agent":"GATE-Companion","Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
  if (!response.ok) {
    if (response.status===401 || response.status===403) throw new Error("GitHub rejected access. Check token expiry and Contents read/write permission for Ansh1040/New.");
    if (response.status===409 || response.status===422) throw new Error("The shared page changed during publishing. Try publishing again.");
    throw new Error("GitHub publishing is temporarily unavailable. Your tracker progress is saved.");
  }
  return response.json() as Promise<{sha?:string;content?:string;encoding?:string;commit?:{sha:string}}>;
}
export async function githubConnection(userId: string) {
  const row = await env.DB.prepare("SELECT updated_at FROM github_connections WHERE user_id = ?").bind(userId).first<{updated_at:string}>();
  return {connected:!!row,configured:!!(env as unknown as {GITHUB_TOKEN_ENCRYPTION_KEY?:string}).GITHUB_TOKEN_ENCRYPTION_KEY,connectedAt:row?.updated_at ?? null};
}
export async function connectGithub(userId: string, token: string) {
  if (!token.startsWith("github_pat_") || token.length > 500 || /\s/.test(token)) throw new Error("Use a fine-grained GitHub personal access token for Ansh1040/New.");
  await github(token);
  const encrypted = await sealToken(token,userId,encryptionKey());
  await env.DB.prepare("INSERT INTO github_connections (user_id, encrypted_token, updated_at) VALUES (?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET encrypted_token=excluded.encrypted_token, updated_at=excluded.updated_at").bind(userId,encrypted,new Date().toISOString()).run();
}
export async function disconnectGithub(userId: string) {
  await env.DB.prepare("DELETE FROM github_connections WHERE user_id = ?").bind(userId).run();
}
export async function publishGithub(userId: string, state: StudyState) {
  const row = await env.DB.prepare("SELECT encrypted_token FROM github_connections WHERE user_id = ?").bind(userId).first<{encrypted_token:string}>();
  if (!row) throw new Error("Connect a restricted GitHub token first.");
  let token;
  try { token = await openToken(row.encrypted_token,userId,encryptionKey()); }
  catch { throw new Error("Reconnect GitHub to restore secure publishing."); }
  const current = await github(token);
  const snapshot = sharedProgress(state);
  if (current.encoding !== "base64" || !current.content || !current.sha) throw new Error("The GitHub snapshot file is unavailable.");
  const decoded = new TextDecoder().decode(Uint8Array.from(atob(current.content.replace(/\s/g,"")),c=>c.charCodeAt(0)));
  const previous = JSON.parse(decoded);
  if (Date.parse(previous.updatedAt) > Date.parse(state.updatedAt)) throw new Error("A newer snapshot is already shared. Refresh the tracker and try again.");
  if (JSON.stringify(previous) === JSON.stringify(snapshot)) return {url:pageURL,changed:false,updatedAt:state.updatedAt};
  const bytes = new TextEncoder().encode(JSON.stringify(snapshot,null,2)+"\n");
  let binary = "";
  for (let start = 0; start < bytes.length; start += 8192) binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
  const result = await github(token,"PUT",{message:"Update shared CS GATE progress",branch:"main",sha:current.sha,content:btoa(binary)});
  return {url:pageURL,changed:true,commit:result.commit?.sha,updatedAt:state.updatedAt};
}
