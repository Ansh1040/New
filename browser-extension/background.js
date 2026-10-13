const trackerOrigin = "https://cs-gate-study-tracker.magicnova16.chatgpt.site";
const batchForURL = url => {
  const route = new URL(url).pathname.split("/")[3];
  return /^[a-f0-9]{24}$/.test(route || "") ? route
    : route === "parakram-2-0-gate-2027-batch-e--hinglish----computer-science-478697"
      ? "6a6db276dcb67d138689a93d" : null;
};
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (!sender.tab || sender.frameId !== 0 || !sender.url || new URL(sender.url).origin !== trackerOrigin || message.action !== "capture") return;
  (async () => {
    const tabs = await chrome.tabs.query({url:"https://www.pw.live/study-v2/batches/*"});
    const candidates = tabs.filter(tab => batchForURL(tab.url) && (!message.batchId || batchForURL(tab.url) === message.batchId));
    const batches = new Set(candidates.map(tab => batchForURL(tab.url)));
    if (batches.size > 1) throw new Error("More than one PW batch is open. Keep only your CS GATE batch open for the first sync.");
    if (!candidates.length) throw new Error("Open your signed-in PW batch's All Tests, All Classes or subject chapter page in this browser, then sync again.");
    const snapshots = [];
    for (const tab of candidates.slice(0,10)) {
      const result = await chrome.scripting.executeScript({target:{tabId:tab.id}, files:["reader.js"]});
      const snapshot = result[0]?.result;
      if (snapshot && (snapshot.tests.length || snapshot.subjects.length || snapshot.dpp?.chapters.length || snapshot.dpp?.resources.length)) snapshots.push(snapshot);
    }
    if (!snapshots.length) throw new Error("No progress cards are loaded. Open PW's All Tests, All Classes, a subject's Chapters, or a chapter's DPP tab, wait for its cards, then sync again.");
    reply({snapshots});
  })().catch(error => reply({error:error.message || "Could not read PW. Reload the PW tab and try again."}));
  return true;
});
