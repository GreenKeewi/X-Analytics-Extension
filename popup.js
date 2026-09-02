async function render() {
  const { tweets = {} } = await chrome.storage.local.get("tweets");
  const list = Object.values(tweets);
  const posts = list.filter((t) => !t.isReply).length;
  const replies = list.filter((t) => t.isReply).length;
  const totalViews = list.reduce((sum, t) => sum + (t.views || 0), 0);

  const statsEl = document.getElementById("stats");
  statsEl.innerHTML = "";
  const rows = [
    ["Tracked posts", posts],
    ["Tracked replies", replies],
    ["Total views collected", totalViews.toLocaleString()],
  ];
  for (const [label, value] of rows) {
    const row = document.createElement("div");
    row.className = "stat";
    row.innerHTML = `<span>${label}</span><span>${value}</span>`;
    statsEl.appendChild(row);
  }
}

document.getElementById("open").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});

render();
