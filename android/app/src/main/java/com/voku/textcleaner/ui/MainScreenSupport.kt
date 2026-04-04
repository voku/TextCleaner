package com.voku.textcleaner.ui

import android.content.Context
import android.util.Log
import com.voku.textcleaner.core.CleanedResult
import com.voku.textcleaner.core.SourceType
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

internal data class SamplePreset(
    val text: String,
    val preset: SourceType?,
)

/**
 * Persisted cleanup history entry.
 *
 * `timestamp` is stored as Unix time in milliseconds.
 */
internal data class HistoryItem(
    val id: String,
    val timestamp: Long,
    val rawText: String,
    val preset: SourceType?,
    val result: CleanedResult,
)

internal data class LoadedCodeSnippet(
    val title: String,
    val content: String,
)

internal val samplesByPreset = mapOf<SourceType?, SamplePreset>(
    null to SamplePreset(
        preset = null,
        text = """Skip to content
Navigation Menu
Pull requests
Issues
# Fix the bug
This PR fixes the bug.
Files changed
1
Commits
2
Review
requested changes
Copy link
Quote reply
Terms
Privacy""",
    ),
    SourceType.GENERIC to SamplePreset(
        preset = SourceType.GENERIC,
        text = """Menu
Sign in
Quarterly planning notes
We want a short summary of the current release risks and the mitigation plan.
Advertisement
More content follows here.
Footer
Terms""",
    ),
    SourceType.GITHUB_PR to SamplePreset(
        preset = SourceType.GITHUB_PR,
        text = """Skip to content
Navigation Menu
Pull requests
Issues
# Fix the bug
This PR fixes the bug.
Files changed
1
Commits
2
Review
requested changes
Copy link
Quote reply
Terms
Privacy""",
    ),
    SourceType.GITHUB_ISSUE to SamplePreset(
        preset = SourceType.GITHUB_ISSUE,
        text = """Skip to content
Repository navigation
Issues
# Crash in export flow
Open issue
Labels
bug
Assignees
No one assigned
The export flow crashes when a draft document contains emoji.
Comment
Terms
Privacy""",
    ),
    SourceType.DOCS to SamplePreset(
        preset = SourceType.DOCS,
        text = """Documentation
Table of contents
On this page
# Deploying TextCleaner
Use the production build for GitHub Pages deployments.

## Build
Run npm run build to generate the dist directory.

Edit this page
Back to top
Was this page helpful?""",
    ),
    SourceType.ARTICLE to SamplePreset(
        preset = SourceType.ARTICLE,
        text = """Latest
8 min read
# Why clean copied text before prompting
Clean input reduces irrelevant context and makes summaries more reliable.

Related articles
Sign up for our newsletter
Continue reading""",
    ),
    SourceType.CHAT to SamplePreset(
        preset = SourceType.CHAT,
        text = """Messages
Jump to present
Today
John Doe 10:42 AM
Can you review the cleaned output before release?
Jane Smith 10:43 AM
Yes — please send the GitHub Pages URL when it is ready.
Reply in thread
Typing…""",
    ),
)

private data class CodeSnippetSource(
    val title: String,
    val assetPath: String,
)

private const val historyPrefsName = "text_cleaner_history"
private const val historyPrefsKey = "items"
private const val maxHistoryItems = 50
private const val mainScreenSupportTag = "TextCleanerUiSupport"

private val codeSnippetSources = listOf(
    CodeSnippetSource("core/Engine.kt", "cleanup-logic/Engine.kt"),
    CodeSnippetSource("core/rules/GenericRuleSet.kt", "cleanup-logic/GenericRuleSet.kt"),
    CodeSnippetSource("core/rules/GitHubRuleSet.kt", "cleanup-logic/GitHubRuleSet.kt"),
)

internal fun loadHistory(context: Context): List<HistoryItem> {
    val raw = context.getSharedPreferences(historyPrefsName, Context.MODE_PRIVATE)
        .getString(historyPrefsKey, null)
        ?: return emptyList()

    return runCatching {
        val items = JSONArray(raw)
        buildList {
            for (index in 0 until items.length()) {
                val item = items.getJSONObject(index)
                add(
                    HistoryItem(
                        id = item.getString("id"),
                        timestamp = item.getLong("timestamp"),
                        rawText = item.getString("rawText"),
                        preset = item.takeUnless { it.isNull("preset") }
                            ?.getString("preset")
                            ?.let(SourceType::valueOf),
                        result = item.getJSONObject("result").toCleanedResult(),
                    ),
                )
            }
        }
    }.onFailure {
        Log.w(mainScreenSupportTag, "Unable to parse saved history", it)
    }.getOrDefault(emptyList())
}

internal fun saveHistory(context: Context, history: List<HistoryItem>) {
    val payload = JSONArray()
    history.forEach { item ->
        payload.put(item.toJson())
    }
    context.getSharedPreferences(historyPrefsName, Context.MODE_PRIVATE)
        .edit()
        .putString(historyPrefsKey, payload.toString())
        .apply()
}

internal fun appendHistory(
    context: Context,
    history: List<HistoryItem>,
    rawText: String,
    preset: SourceType?,
    result: CleanedResult,
): List<HistoryItem> {
    val updated = listOf(
        HistoryItem(
            id = UUID.randomUUID().toString(),
            timestamp = System.currentTimeMillis(),
            rawText = rawText,
            preset = preset,
            result = result,
        ),
    ) + history

    return updated.take(maxHistoryItems).also { saveHistory(context, it) }
}

internal fun loadCodeSnippets(context: Context): List<LoadedCodeSnippet> =
    codeSnippetSources.map { source ->
        LoadedCodeSnippet(
            title = source.title,
            content = runCatching {
                context.assets.open(source.assetPath).bufferedReader().use { it.readText() }
            }.getOrElse {
                Log.w(mainScreenSupportTag, "Unable to load ${source.title}", it)
                "Unable to load ${source.title}."
            },
        )
    }

private fun HistoryItem.toJson(): JSONObject = JSONObject().apply {
    put("id", id)
    put("timestamp", timestamp)
    put("rawText", rawText)
    put("preset", preset?.name ?: JSONObject.NULL)
    put("result", result.toJson())
}

private fun CleanedResult.toJson(): JSONObject = JSONObject().apply {
    put("detectedType", detectedType.name)
    put("cleanedText", cleanedText)
    put("markdownText", markdownText)
    put("llmPromptText", llmPromptText)
    put("removedLineCount", removedLineCount)
    put("warnings", JSONArray().apply { warnings.forEach(::put) })
}

private fun JSONObject.toCleanedResult(): CleanedResult = CleanedResult(
    detectedType = SourceType.valueOf(getString("detectedType")),
    cleanedText = getString("cleanedText"),
    markdownText = getString("markdownText"),
    llmPromptText = getString("llmPromptText"),
    removedLineCount = getInt("removedLineCount"),
    warnings = getJSONArray("warnings").toStringList(),
)

private fun JSONArray.toStringList(): List<String> =
    (0 until length()).map(::getString)
