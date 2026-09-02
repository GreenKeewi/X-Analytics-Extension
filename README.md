# X Analytics Dashboard (Chrome Extension)

Scrapes the engagement metrics X already renders on your own posts and
replies — replies, reposts, likes, bookmarks, and views — and shows them in
a clean, sortable analytics dashboard inside the extension. No API keys, no
login scraping, no data leaves your browser.

## How it works

- **`content.js`** runs on `x.com` / `twitter.com`. It watches the DOM (via
  `MutationObserver`) for tweet `<article>` elements and reads the counts
  off the engagement bar that X already displays. This works on any page
  where tweets render — your profile's **Posts** tab, **Replies** tab, or a
  single tweet's detail page — so browsing those tabs is what builds up the
  dataset.
- **`background.js`** is a small service worker that receives scraped
  batches and merges them into `chrome.storage.local`, deduped by tweet id.
- **`dashboard.html`/`dashboard.js`** renders the collected data: summary
  stat cards, a top-15-by-views bar chart (inline SVG, no dependencies),
  and a sortable/filterable table with CSV export.
- **`popup.html`/`popup.js`** is the toolbar popup — quick totals and a
  button to open the full dashboard.

## Why it's scoped this way

X's public tweet metrics (views, likes, reposts, replies, bookmarks) are
rendered directly in the page DOM for any tweet you can see — that's what
this extension reads. Deeper analytics (profile visits, engagement rate
breakdowns) live behind X's own `/analytics` page, which is a separate,
author-only view X renders for your own tweets; this extension does not
attempt to scrape that page, since it would need per-tweet navigation
X does not otherwise require. Everything here comes from what's already on
screen as you browse.

## Install (unpacked, for development)

1. `chrome://extensions` → enable **Developer mode**.
2. **Load unpacked** → select this folder.
3. Visit your profile on x.com, browse **Posts** and **Posts & replies**,
   and scroll through your history — each tweet that renders gets scraped.
4. Click the extension icon → **Open Dashboard**.

## Notes / limitations

- Only picks up tweets you actually scroll past — there's no bulk backfill
  API being used here, by design (keeps this a pure content-script reader,
  no X API key required).
- View counts are only shown by X once a tweet has enough views; very new
  or low-reach tweets may show `0` until X starts displaying a count.
- Data is stored locally via `chrome.storage.local` and never leaves the
  browser.
