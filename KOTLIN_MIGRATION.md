# Kotlin Migration Notes

This document outlines the native Android Kotlin port of the web-based text cleaner.

## Status

The Kotlin port lives in the `android/` directory and is structured as a standard Android Gradle project.

### Milestone 1: Kotlin domain port — ✅ Complete

All core cleanup logic has been ported with full test parity:

| TypeScript source | Kotlin target | Status |
|---|---|---|
| `src/core/types.ts` | `core/Types.kt` | ✅ |
| `src/core/rules/generic.ts` | `core/rules/GenericRuleSet.kt` | ✅ |
| `src/core/rules/github.ts` | `core/rules/GitHubRuleSet.kt` | ✅ |
| `src/core/rules/docs.ts` | `core/rules/DocsRuleSet.kt` | ✅ |
| `src/core/rules/article.ts` | `core/rules/ArticleRuleSet.kt` | ✅ |
| `src/core/rules/chat.ts` | `core/rules/ChatRuleSet.kt` | ✅ |
| `src/core/detector.ts` | `core/Detector.kt` | ✅ |
| `src/core/engine.ts` | `core/Engine.kt` | ✅ |
| `src/core/__tests__/engine.test.ts` (25 tests) | `EngineTest.kt` (25 tests) | ✅ |

### Milestone 2: Compose UI — ✅ Complete

- `MainScreen` composable with Raw / Cleaned / Markdown / Prompt tabs
- Preset dropdown (Auto-detect + all source types)
- Copy and Share action buttons
- Status bar showing detected type, removed line count, and warnings

### Milestone 3: Android entry points — ✅ Complete

- `PROCESS_TEXT` intent filter: text-selection context menu integration
- `ACTION_SEND` intent filter: system share-sheet integration
- "Return Cleaned Text" button for `PROCESS_TEXT` callers

### Milestone 4: Polish — future

- Local history / persistence
- Performance tuning for very large texts
- Accessibility audit
- Play Store release preparation

## Android Native Flow (PROCESS_TEXT)
1. User selects text in Chrome or another app.
2. The native Android app appears in the text selection context menu via the `PROCESS_TEXT` intent filter.
3. The app receives the selected text.
4. The app runs the same core cleanup pipeline.
5. The user copies the cleaned output or shares it directly to another app.

## Porting the Core Logic
The core logic in `src/core/` has been ported to Kotlin in `android/app/src/main/java/com/voku/textcleaner/core/`.

### Data Structures (`types.ts` → `Types.kt`)
- `SourceType` → `enum class SourceType`
- `RawInput` → `data class RawInput`
- `CleanupRuleSet` → `data class CleanupRuleSet`
- `CleanedResult` → `data class CleanedResult`

### Rule Sets (`rules/*.ts` → `rules/*.kt`)
Each rule set is a top-level `val` of type `CleanupRuleSet`.
TypeScript regexes map directly to Kotlin `Regex` objects.

### Engine (`engine.ts` → `Engine.kt`)
Ported as an `object Engine` with all public functions matching the TypeScript API.

### Detector (`detector.ts` → `Detector.kt`)
Ported as an `object Detector` with a `detectSourceType(rawText, cleanedText?)` function.

## UI
The Jetpack Compose UI in `ui/MainScreen.kt` mirrors the web app's tab layout:
- **Raw** tab: editable text field for manual paste
- **Cleaned** tab: read-only cleaned output with copy/share
- **Markdown** tab: formatted markdown output with copy/share
- **Prompt** tab: LLM prompt output with copy/share

## Project Structure

```
android/
├── build.gradle.kts              # Root Gradle build
├── settings.gradle.kts
├── gradle.properties
└── app/
    ├── build.gradle.kts          # App module build
    ├── proguard-rules.pro
    └── src/
        ├── main/
        │   ├── AndroidManifest.xml
        │   ├── res/values/
        │   └── java/com/voku/textcleaner/
        │       ├── MainActivity.kt
        │       ├── core/
        │       │   ├── Types.kt
        │       │   ├── Engine.kt
        │       │   ├── Detector.kt
        │       │   └── rules/
        │       │       ├── GenericRuleSet.kt
        │       │       ├── GitHubRuleSet.kt
        │       │       ├── DocsRuleSet.kt
        │       │       ├── ArticleRuleSet.kt
        │       │       └── ChatRuleSet.kt
        │       └── ui/
        │           ├── MainScreen.kt
        │           └── theme/Theme.kt
        └── test/
            └── java/com/voku/textcleaner/core/
                └── EngineTest.kt
```
