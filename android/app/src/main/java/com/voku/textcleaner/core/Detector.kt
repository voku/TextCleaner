package com.voku.textcleaner.core

/**
 * Heuristic source-type detector.
 * Direct port of `src/core/detector.ts`.
 */
object Detector {

    private const val MIN_CHAT_MATCHES = 3
    private const val MIN_CHAT_TOTAL_LINES = 5

    private val chatMessagePattern =
        Regex("^\\[?\\d{1,2}:\\d{2}(?:\\s*[AP]M)?]?\\s*[\\w\\s]+:", setOf(RegexOption.IGNORE_CASE, RegexOption.MULTILINE))
    private val chatNameTimePattern =
        Regex("^[\\w\\s]+\\s+\\d{1,2}:\\d{2}\\s*[AP]M", setOf(RegexOption.IGNORE_CASE, RegexOption.MULTILINE))
    private val slackPattern =
        Regex("new messages?\\s*since", setOf(RegexOption.IGNORE_CASE, RegexOption.MULTILINE))

    private val headingPattern = Regex("^#+\\s", RegexOption.MULTILINE)
    private val listItemPattern = Regex("^[-*]\\s", RegexOption.MULTILINE)

    private val docsKeywords = listOf("api", "documentation", "tutorial", "guide", "reference", "install", "configuration")
    private val articleKeywords = listOf("article", "analysis", "opinion", "story", "interview", "essay")

    fun detectSourceType(rawText: String, cleanedText: String? = null): SourceType {
        val lowerRaw = rawText.lowercase()
        val textToAnalyze = cleanedText ?: rawText
        val lowerCleaned = textToAnalyze.lowercase()

        // GitHub PR
        val isGitHubPR =
            (lowerRaw.contains("pull request") || lowerRaw.contains("files changed") || lowerRaw.contains("commits")) &&
            (lowerRaw.contains("requested changes") || lowerRaw.contains("approved") || lowerRaw.contains("review") || lowerRaw.contains("merge pull request"))

        if (isGitHubPR) {
            return SourceType.GITHUB_PR
        }

        // GitHub Issue
        val isGitHubIssue =
            lowerRaw.contains("issue") &&
            (lowerRaw.contains("labels") || lowerRaw.contains("assignees") || lowerRaw.contains("milestone") || lowerRaw.contains("open issue"))

        if (isGitHubIssue) {
            return SourceType.GITHUB_ISSUE
        }

        // Chat (Slack, Discord, Teams)
        val lines = textToAnalyze.split("\n").map { it.trim() }.filter { it.isNotEmpty() }

        var chatLineCount = 0
        for (line in lines) {
            if (chatMessagePattern.containsMatchIn(line) || chatNameTimePattern.containsMatchIn(line)) {
                chatLineCount++
            }
        }
        if ((chatLineCount >= MIN_CHAT_MATCHES && lines.size >= MIN_CHAT_TOTAL_LINES) || slackPattern.containsMatchIn(lowerRaw)) {
            return SourceType.CHAT
        }

        // Docs/Article heuristics
        val longLines = lines.count { it.length > 80 }
        val paragraphLines = lines.count { it.length > 40 }
        val headings = headingPattern.findAll(textToAnalyze).count()
        val listItems = listItemPattern.findAll(textToAnalyze).count()
        val docsKeywordMatches = docsKeywords.count { lowerCleaned.contains(it) }
        val articleKeywordMatches = articleKeywords.count { lowerCleaned.contains(it) }

        if ((headings > 0 && listItems >= 2) || docsKeywordMatches >= 2) {
            return SourceType.DOCS
        }

        if ((headings > 0 && paragraphLines >= 2) || longLines > 3) {
            // Distinguish between docs and article
            if (listItems > 2 || docsKeywordMatches >= articleKeywordMatches + 1) {
                return SourceType.DOCS
            }
            return SourceType.ARTICLE
        }

        if (paragraphLines >= 3 || articleKeywordMatches > 0) {
            return SourceType.ARTICLE
        }

        return SourceType.GENERIC
    }
}
