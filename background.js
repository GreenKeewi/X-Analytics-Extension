// Service worker: receives scraped tweet batches from content scripts and
// merges them into chrome.storage.local, deduped by tweet id. Later scrapes
// of the same tweet overwrite the stored one (metrics only go up over time,
// so the freshest scrape is the one worth keeping).

const STORAGE_KEY = "tweets";

async function mergeTweets(newTweets) {
  const { [STORAGE_KEY]: existing = {} } = await chrome.storage.local.get(STORAGE_KEY);
  for (const tweet of newTweets) {
    existing[tweet.id] = { ...existing[tweet.id], ...tweet };
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: existing });
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "TWEETS_SCRAPED") {
    mergeTweets(message.tweets).then(() => sendResponse({ ok: true }));
    return true; // async response
  }
  return false;
});
