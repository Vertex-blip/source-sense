# SourceSense

A private, browser-based workbench for assessing the **visible credibility signals** of an article or source. [Open the live app](https://vertex-blip.github.io/source-sense/).

SourceSense does **not** verify facts, determine truth, fetch article contents, or use AI. You inspect the source and assign 0, 1, or 2 points to eight disclosed criteria. The score is simply their sum out of 16. Written observations are as important as the number.

## Features

- Eight clearly explained criteria: author, original evidence, traceable claims, date, editorial context, reporting versus opinion, interests, and corroboration.
- Live score and completion feedback, with all eight ratings required before saving.
- Saved assessments with search, edit, delete, and optional source links.
- JSON backup export and import.
- Responsive interface and keyboard-accessible rating controls.

## Run locally

Open `index.html` in a modern browser. No build, account, API key, or server is required. The app uses only HTML, CSS, and JavaScript. A local HTTP server is also fine, for example `python -m http.server 8000`.

## Privacy and storage

Reviews are stored in this browser's `localStorage` under `sourcesense.assessments.v1`. They are not uploaded. Clearing browser data removes them, so use **Export JSON** for a portable backup. Imported text is inserted as text content to avoid HTML injection. External links allow only HTTP and HTTPS and open with `noopener noreferrer`. No third-party requests or analytics are included.

## Scoring method

Every criterion has equal weight. `0` means no visible support, `1` means partial support, and `2` means clear support. A high score does not prove that a claim is true. Use the notes field to record uncertainty and revisit an assessment when new evidence appears.

## Deployment

This static site can be served directly from the repository root with GitHub Pages. No backend is needed.

## License

MIT — see [LICENSE](LICENSE).
