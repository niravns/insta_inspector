(() => {
  let lastPath = "";

  function reportCurrentReel() {
    const path = window.location.pathname;
    if (path === lastPath) return;
    lastPath = path;

    const match = path.match(/^\/reels?\/([A-Za-z0-9_-]+)\/?$/);
    if (!match) return;

    chrome.runtime.sendMessage({
      type: "reel-visited",
      url: `https://www.instagram.com/reel/${match[1]}/`
    });
  }

  for (const method of ["pushState", "replaceState"]) {
    const original = history[method];
    history[method] = function (...args) {
      const result = original.apply(this, args);
      queueMicrotask(reportCurrentReel);
      return result;
    };
  }

  window.addEventListener("popstate", reportCurrentReel);
  setInterval(reportCurrentReel, 1000);
  reportCurrentReel();
})();
