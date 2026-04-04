package com.voku.textcleaner.core.rules

import com.voku.textcleaner.core.CleanupRuleSet

/**
 * Article cleanup rules.
 * Direct port of `src/core/rules/article.ts`.
 */
val ArticleRuleSet = CleanupRuleSet(
    name = "Article",
    prefixExactLines = GenericRuleSet.prefixExactLines + listOf(
        "Latest",
        "Trending",
        "Recommended",
        "More stories",
    ),
    suffixExactLines = GenericRuleSet.suffixExactLines + listOf(
        "Related articles",
        "Continue reading",
        "Read next",
        "More stories",
    ),
    prefixRegexes = GenericRuleSet.prefixRegexes + listOf(
        Regex("^\\d+\\s+min read$", RegexOption.IGNORE_CASE),
    ),
    suffixRegexes = GenericRuleSet.suffixRegexes + listOf(
        Regex("^Published .*$", RegexOption.IGNORE_CASE),
        Regex("^Updated .*$", RegexOption.IGNORE_CASE),
    ),
    removeAnywhereExactLines = GenericRuleSet.removeAnywhereExactLines + listOf(
        "Related articles",
        "Continue reading",
        "Read next",
        "More stories",
        "Recommended",
    ),
    removeAnywhereContains = GenericRuleSet.removeAnywhereContains + listOf(
        "Sign up for our newsletter",
        "Follow us",
        "Listen to this article",
        "Related articles",
    ),
    removeAnywhereRegexes = listOf(
        Regex("^\\d+\\s+min read$", RegexOption.IGNORE_CASE),
    ),
    preserveRegexes = GenericRuleSet.preserveRegexes + listOf(
        Regex("^\\d+\\.\\s+"),
    ),
)
