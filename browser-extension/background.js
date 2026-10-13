const trackerOrigin = "https://cs-gate-study-tracker.magicnova16.chatgpt.site";
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (!sender.tab || sender.frameId !== 0 || !sender.url || new URL(sender.url).origin !== trackerOrigin || message.action !== "capture") return;
  (async () => {
    const tabs = await chrome.tabs.query({url:"https://www.pw.live/study-v2/batches/*"});
    const candidates = tabs.filter(tab => !message.batchId || new URL(tab.url).pathname.split("/")[3] === message.batchId);
    const batches = new Set(candidates.map(tab => new URL(tab.url).pathname.split("/")[3]));
    if (batches.size > 1) throw new Error("More than one PW batch is open. Keep only your CS GATE batch open for the first sync.");
    if (!candidates.length) throw new Error("Open your signed-in PW batch's All Tests or All Classes page in this browser, then sync again.");
    const snapshots = [];
    for (const tab of candidates.slice(0,10)) {
      const result = await chrome.scripting.executeScript({target:{tabId:tab.id}, files:["reader.js"]});
      const snapshot = result[0]?.result;
      if (snapshot && (snapshot.tests.length || snapshot.subjects.length)) snapshots.push(snapshot);
    }
    if (!snapshots.length) throw new Error("No progress cards are loaded. In PW select All Tests, or open All Classes, wait for the cards, then sync again.");
    reply({snapshots});
  })().catch(error => reply({error:error.message || "Could not read PW. Reload the PW tab and try again."}));
  return true;
});
