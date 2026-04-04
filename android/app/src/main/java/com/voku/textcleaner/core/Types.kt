package com.voku.textcleaner.core

/**
 * Identifies the detected or user-selected source type.
 * Maps 1:1 to the TypeScript `SourceType` union.
 */
enum class SourceType {
    GENERIC,
    GITHUB_PR,
    GITHUB_ISSUE,
    DOCS,
    ARTICLE,
    CHAT;
}

/**
 * Raw input to the cleanup pipeline.
 * Maps 1:1 to the TypeScript `RawInput` type.
 */
data class RawInput(
    val rawText: String,
    val sourceTypeHint: SourceType? = null,
    val sourceApp: String? = null,
)

/**
 * A set of rules used by the cleanup engine to strip site chrome.
 * Maps 1:1 to the TypeScript `CleanupRuleSet` type.
 */
data class CleanupRuleSet(
    val name: String,
    val prefixExactLines: List<String>,
    val suffixExactLines: List<String>,
    val prefixRegexes: List<Regex>,
    val suffixRegexes: List<Regex>,
    val removeAnywhereExactLines: List<String>,
    val removeAnywhereContains: List<String>,
    val removeAnywhereRegexes: List<Regex> = emptyList(),
    val preserveRegexes: List<Regex>,
)

/**
 * Result returned from the cleanup engine.
 * Maps 1:1 to the TypeScript `CleanedResult` type.
 */
data class CleanedResult(
    val detectedType: SourceType,
    val cleanedText: String,
    val markdownText: String,
    val llmPromptText: String,
    val removedLineCount: Int,
    val warnings: List<String>,
)
