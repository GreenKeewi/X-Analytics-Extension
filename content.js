// Scrapes engagement metrics (replies, reposts, likes, bookmarks, views) off
// tweet articles rendered in the DOM on x.com / twitter.com and stores them
// in chrome.storage.local, keyed by tweet id. Only public metrics that X
// already renders in the page are read — nothing is fetched from any API.

const METRIC_KEYS = ["replies", "reposts", "likes", "bookmarks", "views"];

function parseCount(raw) {
  if (!raw) return 0;
  const s = raw.trim().toUpperCase();
  const m = s.match(/^([\d,.]+)([KM]?)$/);
  if (!m) return parseInt(s.replace(/[^\d]/g, ""), 10) || 0;
  let n = parseFloat(m[1].replace(/,/g, ""));
  if (m[2] === "K") n *= 1_000;
  if (m[2] === "M") n *= 1_000_000;
  return Math.round(n);
}

function extractMetricsFromGroup(group) {
  const label = group.getAttribute("aria-label") || "";
  const metrics = { replies: 0, reposts: 0, likes: 0, bookmarks: 0, views: 0 };
  // aria-label looks like: "12 replies, 34 reposts, 56 likes, 7 bookmarks, 8901 views"
  const parts = label.split(",");
  for (const part of parts) {
    const m = part.trim().match(/^([\d.,]+[KM]?)\s+(\w+)/i);
    if (!m) continue;
    const count = parseCount(m[1]);
    const word = m[2].toLowerCase();
    if (word.startsWith("repl")) metrics.replies = count;
    else if (word.startsWith("repost") || word.startsWith("retweet")) metrics.reposts = count;
    else if (word.startsWith("like")) metrics.likes = count;
    else if (word.startsWith("bookmark")) metrics.bookmarks = count;
    else if (word.startsWith("view")) metrics.views = count;
  }
  return metrics;
}

function getProfileContext() {
  // /handle/with_replies -> replies tab, /handle -> posts tab, /handle/status/id -> single tweet
  const path = location.pathname.split("/").filter(Boolean);
  const handle = path[0] || null;
  let tab = "posts";
  if (path.includes("with_replies")) tab = "replies";
  else if (path.includes("media")) tab = "media";
  else if (path.includes("status")) tab = "detail";
  return { handle, tab };
}

function extractTweet(article) {
  const linkEl = article.querySelector('a[href*="/status/"] time')?.closest("a");
  if (!linkEl) return null;
  const href = linkEl.getAttribute("href");
  const idMatch = href.match(/\/status\/(\d+)/);
  if (!idMatch) return null;
  const id = idMatch[1];
  const authorMatch = href.match(/^\/([^/]+)\/status\//);
  const author = authorMatch ? authorMatch[1] : null;

  const timeEl = article.querySelector("time");
  const createdAt = timeEl ? timeEl.getAttribute("datetime") : null;

  const textEl = article.querySelector('[data-testid="tweetText"]');
  const text = textEl ? textEl.textContent.trim() : "";

  const isReplyMarker = article.querySelector('[data-testid="reply"]') && article.textContent.includes("Replying to");

  const group = Array.from(article.querySelectorAll('[role="group"]')).find((g) => {
    const label = (g.getAttribute("aria-label") || "").toLowerCase();
    return METRIC_KEYS.some((k) => label.includes(k.slice(0, -1)));
  });
  if (!group) return null;

  const metrics = extractMetricsFromGroup(group);
  const { handle, tab } = getProfileContext();

  return {
    id,
    author,
    url: `https://x.com${href}`,
    text,
    createdAt,
    isReply: tab === "replies" || Boolean(isReplyMarker),
    viewedOnProfile: handle,
    tab,
    scrapedAt: new Date().toISOString(),
    ...metrics,
  };
}

function scrapeVisible() {
  const articles = document.querySelectorAll('article[data-testid="tweet"]');
  const tweets = [];
  for (const article of articles) {
    try {
      const tweet = extractTweet(article);
      if (tweet) tweets.push(tweet);
    } catch (e) {
      // skip malformed article, keep scraping the rest
    }
  }
  if (tweets.length) {
    chrome.runtime.sendMessage({ type: "TWEETS_SCRAPED", tweets });
  }
}

let scheduled = false;
function scheduleScrape() {
  if (scheduled) return;
  scheduled = true;
  setTimeout(() => {
    scheduled = false;
    scrapeVisible();
  }, 500);
}

const observer = new MutationObserver(scheduleScrape);
observer.observe(document.body, { childList: true, subtree: true });

scheduleScrape();
