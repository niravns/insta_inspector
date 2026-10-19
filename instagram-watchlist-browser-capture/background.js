const BRIDGE_URL = "http://127.0.0.1:8765/capture";

chrome.runtime.onInstalled.addListener(async () => {
  const { captureEnabled } = await chrome.storage.local.get("captureEnabled");
  if (captureEnabled === undefined) {
    await chrome.storage.local.set({ captureEnabled: true });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "get-status") {
    chrome.storage.local.get("captureEnabled").then(({ captureEnabled }) => {
      sendResponse({ captureEnabled: captureEnabled !== false });
    });
    return true;
  }

  if (message?.type === "set-status") {
    chrome.storage.local.set({ captureEnabled: Boolean(message.enabled) }).then(() => {
      sendResponse({ captureEnabled: Boolean(message.enabled) });
    });
    return true;
  }

  if (message?.type !== "reel-visited" || sender.url?.startsWith("https://www.instagram.com/") !== true) {
    return false;
  }

  chrome.storage.local.get("captureEnabled").then(async ({ captureEnabled }) => {
    if (captureEnabled === false) return;
    try {
      const response = await fetch(BRIDGE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: message.url })
      });
      const result = await response.json();
      await chrome.storage.local.set({ lastCapture: result });
    } catch (error) {
      await chrome.storage.local.set({ lastCapture: { error: "Watchlist helper is not running." } });
    }
  });
  return false;
});
