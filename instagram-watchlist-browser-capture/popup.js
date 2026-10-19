const statusNode = document.getElementById("status");
const toggle = document.getElementById("toggle");
const lastNode = document.getElementById("last");

async function refresh() {
  const { captureEnabled } = await chrome.storage.local.get("captureEnabled");
  const { lastCapture } = await chrome.storage.local.get("lastCapture");
  const enabled = captureEnabled !== false;
  statusNode.textContent = enabled ? "Automatic capture is on." : "Automatic capture is paused.";
  toggle.textContent = enabled ? "Pause capture" : "Resume capture";
  if (lastCapture?.error) {
    lastNode.textContent = lastCapture.error;
  } else if (lastCapture?.saved) {
    lastNode.textContent = `Saved: ${lastCapture.url}`;
  } else {
    lastNode.textContent = "Open a Reel on Instagram.com to capture its link.";
  }
}

toggle.addEventListener("click", async () => {
  const { captureEnabled } = await chrome.storage.local.get("captureEnabled");
  await chrome.storage.local.set({ captureEnabled: captureEnabled === false });
  await refresh();
});

refresh();
