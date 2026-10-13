const encode = (data: Uint8Array) => btoa(String.fromCharCode(...data));
const decode = (data: string) => Uint8Array.from(atob(data), c => c.charCodeAt(0));
async function key(secret: string) {
  const bytes = decode(secret);
  if (bytes.length !== 32) throw new Error("GitHub token encryption is not configured.");
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function sealToken(token: string, userId: string, secret: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:new TextEncoder().encode(userId)}, await key(secret), new TextEncoder().encode(token));
  return JSON.stringify({version:1,iv:encode(iv),data:encode(new Uint8Array(data))});
}
export async function openToken(value: string, userId: string, secret: string) {
  const item = JSON.parse(value);
  if (item.version !== 1) throw new Error("Reconnect GitHub to continue.");
  const data = await crypto.subtle.decrypt({name:"AES-GCM",iv:decode(item.iv),additionalData:new TextEncoder().encode(userId)}, await key(secret), decode(item.data));
  return new TextDecoder().decode(data);
}
