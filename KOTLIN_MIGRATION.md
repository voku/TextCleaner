# Kotlin Migration Notes

This document outlines how to port the web-based text cleaner to a native Android Kotlin application.

The Android native rewrite is a future milestone. The current priority is to finish and ship the production-ready web app first.

## Intended Android Native Flow (PROCESS_TEXT)
1. User selects text in Chrome or another app.
2. The native Android app appears in the text selection context menu via the \`PROCESS_TEXT\` intent filter.
3. The app receives the selected text.
4. The app runs the same core cleanup pipeline.
5. The user copies the cleaned output or shares it directly to another app.

## Porting the Core Logic
The core logic in \`src/core/\` is designed to be easily ported to Kotlin.

### Data Structures (\`types.ts\`)
Map these directly to Kotlin Data Classes or Enums:
- \`SourceType\` -> \`enum class SourceType\`
- \`RawInput\` -> \`data class RawInput\`
- \`CleanupRuleSet\` -> \`data class CleanupRuleSet\`
- \`CleanedResult\` -> \`data class CleanedResult\`

### Rule Sets (\`rules/generic.ts\`, \`rules/github.ts\`)
These can be implemented as Kotlin objects or companion objects returning instances of \`CleanupRuleSet\`.
Regexes in TypeScript (e.g., \`/^#+ /\`) map directly to Kotlin \`Regex\` objects (e.g., \`Regex("^#+ ")\`).

### Engine (\`engine.ts\`)
The pure functions in \`engine.ts\` can be ported as top-level Kotlin functions or methods within a \`CleanupEngine\` object.
- \`normalizeText\`: Use Kotlin's \`String.lines()\` and \`String.trim()\`.
- \`trimPrefix\`, \`trimSuffix\`, \`cleanMiddle\`: Use Kotlin's collection operations (\`filter\`, \`dropWhile\`, \`takeWhile\`, etc.) or simple loops.
- \`collapseBlankLines\`: A simple loop or \`fold\` operation.

### Detector (\`detector.ts\`)
The heuristic detection logic can be ported to a \`SourceDetector\` object with a \`detect(text: String): SourceType\` function.

## UI Concepts
The React UI (\`App.tsx\`) is web-specific. In Android, you would use Jetpack Compose to build a tiny UI that:
- Receives the intent text.
- Shows the cleaned text.
- Provides buttons to copy or share.

The tabs (Raw, Cleaned, Markdown, Prompt) can be implemented using Compose \`TabRow\` and \`HorizontalPager\`.
