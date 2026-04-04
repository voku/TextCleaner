# TextCleaner

TextCleaner is a browser-based utility for cleaning noisy copied text before you paste it into an LLM, issue comment, document, or note.

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
- Local history stored in the browser
- Export helpers for copy and download

## How it works

1. Normalize pasted text.
2. Detect the source type when auto-detect is enabled.
3. Apply source-specific cleanup rules.
4. Remove noisy prefix, suffix, and repeated UI lines.
5. Preserve headings, bullets, code blocks, filenames, and review content.
6. Return cleaned text, markdown, and a reusable prompt.

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

## Key files

- `src/App.tsx` — main UI
- `src/core/engine.ts` — cleanup pipeline
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
./gradlew assembleDebug
# APK: app/build/outputs/apk/debug/app-debug.apk
```

### Android CI

The repository includes a `build-android.yml` workflow that:

1. builds the debug APK with Gradle,
2. attaches it to the rolling pre-release tag `android-latest`, and
3. uploads it as a workflow artifact (retained for 30 days).

The release is updated automatically on every push to `main`.

## Architecture

- React + TypeScript frontend
- Vite build pipeline
- Pure rule-based cleanup engine in `src/core/`
- Static hosting via GitHub Pages
- Android native app in `android/` (Kotlin + Jetpack Compose)

## Roadmap

### Now

- Polish the web app
- Improve cleanup quality for real copied content
- Ship and maintain the GitHub Pages deployment
- Android native app

### Later

- Kotlin rewrite / port of the full cleanup engine
- Native share-target flow for Android

## Contributing

Issues, suggestions, and pull requests are welcome:

- https://github.com/voku/TextCleaner/
