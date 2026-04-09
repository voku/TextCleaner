# TextCleaner

TextCleaner is a web, Chrome-extension, and Android utility for cleaning noisy copied text before you paste it into an LLM, issue comment, document, or note.

It removes obvious site chrome from copied content such as GitHub pull requests, GitHub issues, documentation pages, articles, and chat transcripts while preserving the lines that matter.

## Features

- Heuristic cleanup with no backend or hosted AI dependency
- Source auto-detection for:
  - GitHub pull requests
  - GitHub issues
  - Documentation pages
  - Articles
  - Chat transcripts
  - Generic copied text
- Multiple output modes:
  - Cleaned text
  - Markdown excerpt
  - Reusable prompt text
- Local history in the web and Android apps
- Chrome popup workflow with active-tab text selection import
- Export helpers for copy and download/save

## How it works

1. **Normalize** pasted text (line endings, Unicode noise, no-break spaces).
2. **Detect** the source type when auto-detect is enabled.
3. **Protect** valuable context blocks before any removal runs — code fences are always protected; rule sets can also declare `preserveBlockPatterns` (e.g. diff hunks) that are immune from all cleanup rules.
4. **Clean** — remove noisy prefix/suffix chrome, structural bot sections (`blockPatterns`), and repeated UI lines anywhere in the body.
5. **Format** — collapse blank lines, then return cleaned text, a Markdown excerpt, and a reusable LLM prompt.

## Supported inputs

### Strongest support

- GitHub pull requests
- GitHub issues
- Documentation pages
- Articles
- Chat transcripts

### Current limitations

- Cleanup is conservative by design and may leave some page-specific noise behind.
- Extremely unusual site layouts may still need manual touch-up.
- Markdown output is a cleaned wrapper around the extracted text, not a full semantic reconstruction of the original page.

## Local development

```bash
npm ci
npm run dev
```

The Vite dev server starts on port `3000`.

## Quality checks

```bash
npm run lint
npm run build
npm test
```

## Deployment

The repository includes a GitHub Pages workflow that:

1. installs dependencies,
2. builds the Vite app,
3. uploads the `dist/` artifact, and
4. deploys it to GitHub Pages.

The workflow sets `VITE_BASE_PATH=/TextCleaner/` so built assets resolve correctly under the project page URL.

## Chrome extension (`chome/`)

The repository also includes a Chrome-based browser extension implementation in `chome/`.

### Local extension development

```bash
npm ci
npm run dev:chome
```

### Build the extension

```bash
npm run build:chome
```

Load `/home/runner/work/TextCleaner/TextCleaner/chome/dist` as an unpacked extension in a Chromium-based browser.
The popup can import the current tab selection, clean it with the shared TypeScript engine, keep a local history, and export the cleaned result.

## Key files

- `src/App.tsx` — main UI
- `chome/App.tsx` — Chrome extension popup UI
- `chome/public/manifest.json` — Chrome extension manifest
- `src/core/engine.ts` — cleanup pipeline (`normalizeText`, `computeProtectedLines`, `removeBlocks`, `cleanMiddle`, `cleanText`)
- `src/core/types.ts` — shared types (`BlockPattern`, `CleanupRuleSet` with `blockPatterns` / `preserveBlockPatterns`)
- `src/core/detector.ts` — source detection
- `src/core/rules/generic.ts` — generic cleanup rules
- `src/core/rules/github.ts` — GitHub-specific cleanup rules
- `src/core/rules/docs.ts` — documentation cleanup rules
- `src/core/rules/article.ts` — article cleanup rules
- `src/core/rules/chat.ts` — chat cleanup rules
- `src/core/__tests__/engine.test.ts` — cleanup tests

## Helper prompt: Key Files Detector

Use this prompt after cleaning repository text with TextCleaner:

```text
You are reviewing cleaned repository text. Identify the files that are most important for understanding the feature, bug, or change being discussed.

Return:
1. the likely key files,
2. why each file matters,
3. the order I should read them in,
4. any missing files or tests I should look for next.

Be concise and focus on implementation-critical files, not boilerplate.
```

## Android

A native Android app lives in the `android/` directory.

**Download the latest APK:**
Go to [Releases → Android – latest build](../../releases/tag/android-latest) and download `TextCleaner.apk`.
Enable *Install unknown apps* on your device before opening the file.

### Local Android build

Requires JDK 17 and the Android SDK (API 35).

```bash
cd android
./gradlew testDebugUnitTest assembleCi
# APK: app/build/outputs/apk/ci/app-ci.apk
```

### Android CI

The repository includes a `build-android.yml` workflow that:

1. runs the Android unit tests,
2. builds a minified resource-shrunk CI APK signed with the debug key,
3. attaches it to the rolling pre-release tag `android-latest`, and
4. uploads it as a workflow artifact (retained for 30 days).

The release is updated automatically on every push to `main`.

## Architecture

- React + TypeScript frontend
- Chrome extension popup in `chome/` (React + TypeScript, manifest v3)
- Vite build pipeline
- Pure rule-based cleanup engine in `src/core/`
- Static hosting via GitHub Pages
- Android native app in `android/` (Kotlin + Jetpack Compose)

## Roadmap

### Done

- Polish the web app
- Improve cleanup quality for real copied content
- Ship and maintain the GitHub Pages deployment
- Android native app (Kotlin + Jetpack Compose)
- Kotlin rewrite / port of the full cleanup engine
- Native share-target flow for Android (`ACTION_SEND` and `PROCESS_TEXT` intent filters)
- Explicit "protect blocks" pipeline step — `computeProtectedLines` runs before any removal; `preserveBlockPatterns` field lets rule sets declare content that must never be stripped

## Contributing

Issues, suggestions, and pull requests are welcome:

- https://github.com/voku/TextCleaner/
