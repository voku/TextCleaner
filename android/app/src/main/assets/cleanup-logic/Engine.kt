package com.voku.textcleaner.core

import com.voku.textcleaner.core.rules.ArticleRuleSet
import com.voku.textcleaner.core.rules.ChatRuleSet
import com.voku.textcleaner.core.rules.DocsRuleSet
import com.voku.textcleaner.core.rules.GenericRuleSet
import com.voku.textcleaner.core.rules.GitHubRuleSet

/**
 * Text cleanup engine.
 * Direct port of `src/core/engine.ts`.
 */
object Engine {

    fun getRuleSetForType(type: SourceType): CleanupRuleSet = when (type) {
        SourceType.GITHUB_PR, SourceType.GITHUB_ISSUE -> GitHubRuleSet
        SourceType.DOCS -> DocsRuleSet
        SourceType.ARTICLE -> ArticleRuleSet
        SourceType.CHAT -> ChatRuleSet
        SourceType.GENERIC -> GenericRuleSet
    }

    /**
     * Normalize line endings to `\n`, trim outer whitespace, split into lines.
     * Strips U+FFFC (Object Replacement Character) — web pages replace images/icons
     * with this character when copied as plain text; it is always noise.
     * Normalizes U+00A0 (No-Break Space) to a regular space — avoids mismatches
     * against rule strings that use ordinary spaces.
     */
    fun normalizeText(text: String): List<String> =
        text.replace("\r\n", "\n").trim().split("\n")
            .map { line -> line.replace("\uFFFC", "").replace("\u00A0", " ") }

    fun isPreserved(line: String, ruleSet: CleanupRuleSet): Boolean =
        ruleSet.preserveRegexes.any { it.containsMatchIn(line) }

    fun trimPrefix(lines: List<String>, ruleSet: CleanupRuleSet): List<String> {
        var unrecognizedCount = 0
        var lastJunkIndex = -1

        for (i in lines.indices) {
            val line = lines[i].trim()
            if (line.isEmpty()) continue

            var isJunk = false
            if (line in ruleSet.prefixExactLines) {
                isJunk = true
            } else if (ruleSet.prefixRegexes.any { it.containsMatchIn(line) }) {
                isJunk = true
            }

            if (isJunk) {
                lastJunkIndex = i
                unrecognizedCount = 0
            } else {
                if (isPreserved(line, ruleSet)) {
                    break
                }
                unrecognizedCount++
                if (unrecognizedCount > 5) {
                    break
                }
            }
        }

        return if (lastJunkIndex >= 0) {
            lines.subList(lastJunkIndex + 1, lines.size)
        } else {
            lines
        }
    }

    fun trimSuffix(lines: List<String>, ruleSet: CleanupRuleSet): List<String> {
        var unrecognizedCount = 0
        var firstJunkIndex = lines.size

        for (i in lines.indices.reversed()) {
            val line = lines[i].trim()
            if (line.isEmpty()) continue

            var isJunk = false
            if (line in ruleSet.suffixExactLines) {
                isJunk = true
            } else if (ruleSet.suffixRegexes.any { it.containsMatchIn(line) }) {
                isJunk = true
            }

            if (isJunk) {
                firstJunkIndex = i
                unrecognizedCount = 0
            } else {
                if (isPreserved(line, ruleSet)) {
                    break
                }
                unrecognizedCount++
                if (unrecognizedCount > 5) {
                    break
                }
            }
        }

        return if (firstJunkIndex < lines.size) {
            lines.subList(0, firstJunkIndex)
        } else {
            lines
        }
    }

    /**
     * Remove structural blocks identified by start/end marker patterns.
     * Enables removing multi-line sections (e.g. CodeRabbit review tables,
     * bot review sections) that individual line matching cannot catch.
     * Port of `removeBlocks()` in `src/core/engine.ts`.
     */
    fun removeBlocks(lines: List<String>, ruleSet: CleanupRuleSet): List<String> {
        val patterns = ruleSet.blockPatterns
        if (patterns.isEmpty()) return lines

        val result = mutableListOf<String>()
        var inCodeBlock = false
        var i = 0

        while (i < lines.size) {
            val trimmed = lines[i].trim()

            // Track code blocks — never remove inside them
            if (trimmed.startsWith("```")) {
                inCodeBlock = !inCodeBlock
                result.add(lines[i])
                i++
                continue
            }

            if (inCodeBlock) {
                result.add(lines[i])
                i++
                continue
            }

            // Try to match a block start
            var matched = false
            for (bp in patterns) {
                if (bp.start.containsMatchIn(trimmed)) {
                    val maxLen = bp.maxLines
                    if (bp.end != null) {
                        // Scan forward for the end pattern
                        var j = i + 1
                        var found = false
                        while (j < lines.size && (j - i) < maxLen) {
                            if (bp.end.containsMatchIn(lines[j].trim())) {
                                found = true
                                j++ // skip the end line too
                                break
                            }
                            j++
                        }
                        if (found) {
                            i = j // skip entire block
                            matched = true
                        }
                        // If end not found within maxLines, don't remove anything
                    } else {
                        // No end pattern — block extends to the first blank line, or to
                        // maxConsecutiveBlankLines consecutive blank lines when > 1.
                        var j = i + 1
                        var consecutiveBlanks = 0
                        while (j < lines.size && (j - i) < maxLen) {
                            if (lines[j].trim().isEmpty()) {
                                consecutiveBlanks++
                                if (consecutiveBlanks >= bp.maxConsecutiveBlankLines) {
                                    break
                                }
                            } else {
                                consecutiveBlanks = 0
                            }
                            j++
                        }
                        i = j // skip block (terminating blank line kept on next iteration)
                        matched = true
                    }
                    break
                }
            }

            if (!matched) {
                result.add(lines[i])
                i++
            }
        }

        return result
    }

    fun cleanMiddle(
        lines: List<String>,
        ruleSet: CleanupRuleSet,
        skipIntensive: Boolean = false,
    ): List<String> {
        var inCodeBlock = false

        return lines.filter { line ->
            val trimmed = line.trim()

            if (trimmed.startsWith("```")) {
                inCodeBlock = !inCodeBlock
                return@filter true
            }

            if (inCodeBlock) {
                return@filter true
            }

            if (trimmed.isEmpty()) return@filter true // Keep blank lines for now, collapse later

            if (isPreserved(trimmed, ruleSet)) {
                return@filter true
            }

            if (trimmed in ruleSet.removeAnywhereExactLines) {
                return@filter false
            }

            if (!skipIntensive) {
                if (ruleSet.removeAnywhereContains.any { trimmed.contains(it) }) {
                    return@filter false
                }

                if (ruleSet.removeAnywhereRegexes.any { it.containsMatchIn(trimmed) }) {
                    return@filter false
                }
            }

            true
        }
    }

    fun collapseBlankLines(lines: List<String>): List<String> {
        val result = mutableListOf<String>()
        var previousWasBlank = false

        for (line in lines) {
            val isBlank = line.trim().isEmpty()
            if (isBlank) {
                if (!previousWasBlank) {
                    result.add(line)
                    previousWasBlank = true
                }
            } else {
                result.add(line)
                previousWasBlank = false
            }
        }

        // Trim leading blank lines
        while (result.isNotEmpty() && result[0].trim().isEmpty()) {
            result.removeAt(0)
        }
        // Trim trailing blank lines
        while (result.isNotEmpty() && result[result.size - 1].trim().isEmpty()) {
            result.removeAt(result.size - 1)
        }

        return result
    }

    private fun formatSourceTypeLabel(type: SourceType): String = when (type) {
        SourceType.GITHUB_PR -> "GitHub Pull Request"
        SourceType.GITHUB_ISSUE -> "GitHub Issue"
        SourceType.DOCS -> "Documentation"
        SourceType.ARTICLE -> "Article"
        SourceType.CHAT -> "Chat"
        SourceType.GENERIC -> "Text"
    }

    private fun normalizeMarkdownBody(lines: List<String>, type: SourceType): List<String> {
        if (type == SourceType.CHAT) {
            var inCodeBlock = false
            return lines.map { line ->
                val trimmed = line.trim()
                if (trimmed.isEmpty()) {
                    return@map ""
                }
                if (trimmed.startsWith("```")) {
                    inCodeBlock = !inCodeBlock
                    return@map trimmed
                }
                if (inCodeBlock) {
                    return@map trimmed
                }
                if (trimmed.startsWith("- ") ||
                    trimmed.startsWith("* ") ||
                    trimmed.startsWith("> ") ||
                    trimmed.startsWith("#")
                ) {
                    return@map trimmed
                }
                "- $trimmed"
            }
        }
        return lines
    }

    fun generateMarkdown(text: String, type: SourceType): String {
        val lines = normalizeText(text)
        if (lines.isEmpty()) {
            return ""
        }

        val title = "# Cleaned ${formatSourceTypeLabel(type)} Excerpt"
        val body = normalizeMarkdownBody(lines, type).joinToString("\n")

        return "$title\n\n$body".trim()
    }

    fun generatePrompt(text: String, type: SourceType): String {
        val typeLabel = formatSourceTypeLabel(type)

        return listOf(
            "Review the following cleaned ${typeLabel.lowercase()} excerpt.",
            "Focus on the substantive content and ignore any residual site chrome.",
            "",
            text,
            "",
        ).joinToString("\n")
    }

    fun cleanText(input: RawInput, ruleSetOverride: CleanupRuleSet? = null): CleanedResult {
        val isLargeText = input.rawText.length > 100_000
        val originalLines = normalizeText(input.rawText)

        var detectedType = input.sourceTypeHint
        var preliminaryCleanedLines = originalLines

        // If no hint is provided, do a preliminary generic clean to help detection
        if (detectedType == null) {
            preliminaryCleanedLines = trimPrefix(originalLines, GenericRuleSet)
            preliminaryCleanedLines = trimSuffix(preliminaryCleanedLines, GenericRuleSet)
            preliminaryCleanedLines = cleanMiddle(preliminaryCleanedLines, GenericRuleSet, isLargeText)
            preliminaryCleanedLines = collapseBlankLines(preliminaryCleanedLines)

            detectedType = Detector.detectSourceType(input.rawText, preliminaryCleanedLines.joinToString("\n"))
        }

        val ruleSet = ruleSetOverride ?: getRuleSetForType(detectedType)

        var currentLines: List<String>

        // If the ruleSet is GenericRuleSet, we already did the work!
        if (ruleSet == GenericRuleSet && ruleSetOverride == null && input.sourceTypeHint == null) {
            currentLines = preliminaryCleanedLines
        } else {
            currentLines = trimPrefix(originalLines, ruleSet)
            currentLines = trimSuffix(currentLines, ruleSet)
            currentLines = removeBlocks(currentLines, ruleSet)
            currentLines = cleanMiddle(currentLines, ruleSet, isLargeText)
            currentLines = collapseBlankLines(currentLines)
        }

        val cleanedText = currentLines.joinToString("\n")
        val removedLineCount = originalLines.size - currentLines.size

        return CleanedResult(
            detectedType = detectedType,
            cleanedText = cleanedText,
            markdownText = generateMarkdown(cleanedText, detectedType),
            llmPromptText = generatePrompt(cleanedText, detectedType),
            removedLineCount = removedLineCount,
            warnings = if (removedLineCount == 0 && originalLines.size > 10) {
                listOf("Low confidence: No lines were removed.")
            } else {
                emptyList()
            },
        )
    }
}
