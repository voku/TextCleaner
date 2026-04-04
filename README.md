# Text Cleaner

A web-first prototype for a mobile text-cleaning tool.

## Problem
When copying selected text from noisy mobile web pages such as GitHub pull requests, issues, docs, or articles, the copied content often includes navigation, footer text, sidebars, repeated labels, and other static UI strings. The tool cleans that selection so the result is easier to paste into another LLM session.

## Architecture
- **Web-First**: Built with React and TypeScript for fast iteration.
- **Pure Core Logic**: The cleanup engine is isolated, deterministic, and rule-based.
- **No Backend**: Runs entirely in the browser.
- **No AI**: Uses heuristic rules to clean text.

## Core Logic
1. Normalize text (line endings, whitespace).
2. Detect source type (e.g., GitHub PR, generic).
3. Trim noisy prefix lines.
4. Trim noisy suffix lines.
5. Conservatively remove repeated static junk lines from the middle.
6. Preserve code-like content, bullets, headings, filenames, and review comments.
7. Collapse excessive blank lines.

## Development
Run \`npm run dev\` to start the development server.
Run \`npx vitest\` to run the unit tests.
