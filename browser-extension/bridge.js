const trackerOrigin = "https://cs-gate-study-tracker.magicnova16.chatgpt.site";
let working = false;
window.addEventListener("message", async event => {
  if (event.source !== window || event.origin !== trackerOrigin || event.data?.source !== "gate-companion" ||
    typeof event.data.id !== "string" || event.data.id.length > 80) return;
  const { id, action, batchId } = event.data;
  const reply = result => window.postMessage({source:"pw-bridge", id, ...result}, trackerOrigin);
  if (action === "ping") { reply({ready:true}); return; }
  if (action !== "sync" || working) return;
  working = true;
  try { reply(await chrome.runtime.sendMessage({action:"capture", batchId})); }
  catch { reply({error:"The PW extension disconnected. Reload this tracker tab and try again."}); }
  finally { working = false; }
});
