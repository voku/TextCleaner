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
 * Defines a structural block that can be detected and removed as a unit.
 * The engine scans for a line matching `start`, then removes all lines
 * until (and including) a line matching `end`.  If `end` is omitted the
 * block extends until the next blank line.
 * Maps 1:1 to the TypeScript `BlockPattern` type.
 */
data class BlockPattern(
    /** Regex that marks the first line of a removable block. */
    val start: Regex,
    /** Regex that marks the last line of the block (inclusive).
     *  When omitted, the block ends at the next blank line. */
    val end: Regex? = null,
    /** Maximum number of lines a block may span (safety cap, default 80). */
    val maxLines: Int = 80,
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
    /** Optional structural block patterns for block-aware removal. */
    val blockPatterns: List<BlockPattern> = emptyList(),
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
