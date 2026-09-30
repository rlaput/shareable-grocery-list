# Shareable Grocery List

An ultra-simple, mobile-first grocery list that runs as a static site (HTML + CSS + vanilla JS). No server, no accounts, no internet needed after the first load.

## Features

- **Quick add** – one text box and an Add button at the top. The keyboard stays open for rapid entry.
- **Tap to cross off** – tap anything on the list to strike it through; tap again to undo.
- **Delete** – tap the ✕ on the right to remove an item. "Remove crossed-off items" clears everything you've collected.
- **Autosave** – the list is stored in `localStorage` on your device.
- **Share List** – encodes the list as JSON → Base64 into a link like `index.html?data=W1siTWlsayIsMF1d`, then opens your phone's native share sheet (WhatsApp, SMS, …). If the share sheet isn't available, the link is copied to the clipboard.
- **Auto-import** – opening a shared link asks whether to **Merge** it with your list, **Replace** your list, or ignore it. Merging skips items you already have (case-insensitive).
- **Offline** – a small service worker caches the app so it opens without signal in the store. Can be added to the home screen.

### About the share encoding

The payload is a compact array of `[text, done]` pairs. Text is converted to UTF-8 before `btoa()` (so emoji and accents work), and the URL-safe Base64 alphabet (`-`/`_`, no `=` padding) is used so the link never breaks inside a query string. Standard Base64 is also accepted when importing.

## Deploy to GitHub Pages

1. Push to GitHub.
2. **Settings → Pages → Build and deployment → Deploy from a branch**, pick your branch and `/ (root)`.
3. Open `https://<user>.github.io/shareable-grocery-list/`.

## Run locally

```sh
python3 -m http.server 8000
# open http://localhost:8000
```

Opening `index.html` directly from disk also works (offline caching and the share sheet need `http(s)`).
