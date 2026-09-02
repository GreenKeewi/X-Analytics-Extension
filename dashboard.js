let allTweets = [];

function fmt(n) {
  return (n || 0).toLocaleString();
}

function applyFilters(tweets) {
  const type = document.getElementById("typeFilter").value;
  const sortBy = document.getElementById("sortBy").value;

  let filtered = tweets;
  if (type === "posts") filtered = filtered.filter((t) => !t.isReply);
  if (type === "replies") filtered = filtered.filter((t) => t.isReply);

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "createdAt") return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    return (b[sortBy] || 0) - (a[sortBy] || 0);
  });

  return filtered;
}

function renderSummary(tweets) {
  const posts = tweets.filter((t) => !t.isReply);
  const replies = tweets.filter((t) => t.isReply);
  const totalViews = tweets.reduce((s, t) => s + (t.views || 0), 0);
  const totalLikes = tweets.reduce((s, t) => s + (t.likes || 0), 0);
  const avgViews = tweets.length ? Math.round(totalViews / tweets.length) : 0;

  const cards = [
    ["Tracked items", tweets.length],
    ["Posts", posts.length],
    ["Replies", replies.length],
    ["Total views", fmt(totalViews)],
    ["Total likes", fmt(totalLikes)],
    ["Avg views / item", fmt(avgViews)],
  ];

  const el = document.getElementById("summary");
  el.innerHTML = cards
    .map(([label, value]) => `<div class="card"><div class="label">${label}</div><div class="value">${value}</div></div>`)
    .join("");
}

function renderChart(tweets) {
  const svg = document.getElementById("chart");
  const top = [...tweets].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 15);
  const width = svg.clientWidth || 900;
  const height = 260;
  const padding = 20;
  const barGap = 6;
  const barWidth = top.length ? (width - padding * 2) / top.length - barGap : 0;
  const maxViews = Math.max(1, ...top.map((t) => t.views || 0));

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svg.innerHTML = "";

  top.forEach((t, i) => {
    const barHeight = ((t.views || 0) / maxViews) * (height - 50);
    const x = padding + i * (barWidth + barGap);
    const y = height - 30 - barHeight;

    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x);
    rect.setAttribute("y", y);
    rect.setAttribute("width", Math.max(barWidth, 2));
    rect.setAttribute("height", barHeight);
    rect.setAttribute("rx", 3);
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `${fmt(t.views)} views — ${(t.text || "").slice(0, 60)}`;
    rect.appendChild(title);
    svg.appendChild(rect);

    const label = document.createElementNS("http://www.w3.org/2000/svg", "text");
    label.setAttribute("x", x + barWidth / 2);
    label.setAttribute("y", height - 12);
    label.setAttribute("text-anchor", "middle");
    label.textContent = t.createdAt ? new Date(t.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "";
    svg.appendChild(label);
  });
}

function renderTable(tweets) {
  const rows = document.getElementById("rows");
  rows.innerHTML = tweets
    .map(
      (t) => `
      <tr>
        <td class="type">${t.isReply ? "reply" : "post"}</td>
        <td>${t.createdAt ? new Date(t.createdAt).toLocaleDateString() : "—"}</td>
        <td class="text"><a class="tweet-link" href="${t.url}" target="_blank" rel="noopener">${escapeHtml(t.text || "(no text)")}</a></td>
        <td class="num">${fmt(t.views)}</td>
        <td class="num">${fmt(t.likes)}</td>
        <td class="num">${fmt(t.reposts)}</td>
        <td class="num">${fmt(t.replies)}</td>
        <td class="num">${fmt(t.bookmarks)}</td>
      </tr>`
    )
    .join("");
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function renderAll() {
  const filtered = applyFilters(allTweets);
  renderSummary(filtered);
  renderChart(filtered);
  renderTable(filtered);
}

function toCsv(tweets) {
  const header = ["type", "createdAt", "text", "views", "likes", "reposts", "replies", "bookmarks", "url"];
  const lines = [header.join(",")];
  for (const t of tweets) {
    const row = [
      t.isReply ? "reply" : "post",
      t.createdAt || "",
      `"${(t.text || "").replace(/"/g, '""')}"`,
      t.views || 0,
      t.likes || 0,
      t.reposts || 0,
      t.replies || 0,
      t.bookmarks || 0,
      t.url || "",
    ];
    lines.push(row.join(","));
  }
  return lines.join("\n");
}

async function load() {
  const { tweets = {} } = await chrome.storage.local.get("tweets");
  allTweets = Object.values(tweets);
  renderAll();
}

document.getElementById("typeFilter").addEventListener("change", renderAll);
document.getElementById("sortBy").addEventListener("change", renderAll);

document.getElementById("exportCsv").addEventListener("click", () => {
  const csv = toCsv(applyFilters(allTweets));
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "x-analytics.csv";
  a.click();
  URL.revokeObjectURL(url);
});

document.getElementById("clearData").addEventListener("click", async () => {
  if (!confirm("Clear all collected analytics data?")) return;
  await chrome.storage.local.remove("tweets");
  await load();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.tweets) load();
});

load();
